package se.sionssanger.app;

import android.app.Activity;
import android.content.*;
import android.database.Cursor;
import android.graphics.*;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.WebView;
import org.json.*;
import java.io.*;
import java.util.*;

/**
 * Private sheet-music library. Nothing is bundled or uploaded.
 * Users explicitly choose their own score images or PDF through Android's picker.
 */
public final class SionsScore {
    public static final int PICK = 1241;
    private final Activity activity;
    private final WebView web;
    private final SharedPreferences prefs;
    private final File directory;
    private volatile String pendingNumber = "";
    private volatile String status = "";

    public SionsScore(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
        this.prefs = activity.getSharedPreferences("sions-scores-v1", 0);
        this.directory = new File(activity.getFilesDir(), "sions-scores");
        directory.mkdirs();
    }

    private static boolean validNumber(String number) {
        return number != null && number.matches("[1-9][0-9]{0,3}[a-z]?");
    }

    public void pick(String number) {
        if (!validNumber(number)) return;
        activity.runOnUiThread(() -> {
            pendingNumber = number;
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_MIME_TYPES,
                new String[]{"image/jpeg", "image/png", "image/webp", "application/pdf"});
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            try { activity.startActivityForResult(intent, PICK); }
            catch (Exception e) { status = "Filväljaren kunde inte öppnas."; notifyUi(); }
        });
    }

    private JSONObject all() {
        try { return new JSONObject(prefs.getString("scores", "{}")); }
        catch (Exception ex) { return new JSONObject(); }
    }

    private void notifyUi() {
        web.post(() -> web.evaluateJavascript(
            "window.dispatchEvent(new Event('sions-score-updated'))", null));
    }

    private static final class Source {
        final Uri uri; final String type;
        Source(Uri uri, String type) { this.uri = uri; this.type = type; }
    }

    public void result(int resultCode, Intent data) {
        if (resultCode != Activity.RESULT_OK || data == null) return;
        final String number = pendingNumber;
        if (!validNumber(number)) return;
        List<Uri> uris = new ArrayList<>();
        if (data.getClipData() != null) {
            for (int i=0;i<data.getClipData().getItemCount();i++)
                uris.add(data.getClipData().getItemAt(i).getUri());
        } else if (data.getData()!=null) uris.add(data.getData());
        new Thread(() -> importSelected(number, uris), "sions-score-import").start();
    }

    private String displayName(Uri uri) {
        try (Cursor c = activity.getContentResolver().query(
                uri, new String[]{OpenableColumns.DISPLAY_NAME}, null,null,null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception ignored) {}
        return "noter";
    }

    private String type(Uri uri) {
        String name = displayName(uri).toLowerCase(Locale.ROOT);
        String mime = activity.getContentResolver().getType(uri);
        if (name.endsWith(".pdf") || "application/pdf".equals(mime)) return "pdf";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png")
            || name.endsWith(".webp") || (mime!=null && mime.startsWith("image/"))) return "image";
        return "";
    }

    private void importSelected(String number, List<Uri> uris) {
        ArrayList<File> newFiles = new ArrayList<>();
        try {
            if (uris.isEmpty() || uris.size()>30) throw new IOException("Välj 1–30 notbilder eller en PDF.");
            ArrayList<Source> sources = new ArrayList<>();
            for (Uri uri:uris) {
                String t=type(uri);
                if (t.isEmpty()) throw new IOException("Endast PDF, JPG, PNG och WebP stöds.");
                sources.add(new Source(uri,t));
            }
            if (sources.size()>1) for(Source source:sources)
                if ("pdf".equals(source.type))
                    throw new IOException("Importera en PDF åt gången eller flera bilder.");

            JSONArray entries = new JSONArray();
            int count = 0;
            for (Source source:sources) {
                String ext = "pdf".equals(source.type)?".pdf":".img";
                File output = new File(directory, UUID.randomUUID().toString()+ext);
                long size=0;
                try (InputStream in = activity.getContentResolver().openInputStream(source.uri);
                     OutputStream out = new FileOutputStream(output)) {
                    if (in==null) throw new IOException("Kunde inte läsa notfilen.");
                    byte[] buffer=new byte[32768];int n;
                    while((n=in.read(buffer))!=-1) {
                        size+=n;
                        if(size>50L*1024*1024) throw new IOException("Notfilen är för stor (max 50 MB).");
                        out.write(buffer,0,n);
                    }
                }
                newFiles.add(output);
                if(size==0) throw new IOException("Tom notfil.");
                int pages=1;
                if ("pdf".equals(source.type)) {
                    try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(output,ParcelFileDescriptor.MODE_READ_ONLY);
                        PdfRenderer pdf=new PdfRenderer(fd)) {
                        pages=pdf.getPageCount();
                    }
                    if (pages<1 || pages>200) throw new IOException("PDF måste ha 1–200 sidor.");
                } else {
                    BitmapFactory.Options o=new BitmapFactory.Options();
                    o.inJustDecodeBounds=true;
                    BitmapFactory.decodeFile(output.getAbsolutePath(),o);
                    if(o.outWidth<1 || o.outHeight<1) throw new IOException("Ogiltig notbild.");
                }
                count+=pages;
                if(count>200) throw new IOException("Högst 200 notsidor per sång.");
                entries.put(new JSONObject().put("file",output.getName()).put("type",source.type)
                    .put("pages",pages).put("name",displayName(source.uri)));
            }
            JSONObject info = new JSONObject().put("count",count)
                .put("mode",sources.size()==1&&"pdf".equals(sources.get(0).type)?"pdf":"images")
                .put("items",entries);
            synchronized(this) {
                JSONObject idx=all(),old=idx.optJSONObject(number);
                if("images".equals(info.optString("mode")) && old!=null && "images".equals(old.optString("mode"))) {
                    // A subsequent image batch adds pages to an existing image score.
                    JSONArray previous=old.optJSONArray("items"), added=info.getJSONArray("items");
                    JSONArray merged=new JSONArray();
                    if(previous!=null)for(int i=0;i<previous.length();i++)merged.put(previous.get(i));
                    for(int i=0;i<added.length();i++)merged.put(added.get(i));
                    if(merged.length()>200)throw new IOException("Högst 200 notbilder per sång.");
                    info.put("items",merged).put("count",merged.length());
                    old=null;
                }
                idx.put(number,info);
                if(!prefs.edit().putString("scores",idx.toString()).commit())
                    throw new IOException("Kunde inte spara notregistret.");
                // Delete the old PDF/images only after the new index has been safely committed.
                if(old!=null)deleteEntries(old);
            }
            status="Noterna har importerats för sång "+number+".";
        } catch(Exception e) {
            for(File file:newFiles)file.delete();
            status="Notimport misslyckades: "+e.getMessage();
        } finally { notifyUi(); }
    }

    private void deleteEntries(JSONObject info) {
        JSONArray entries=info.optJSONArray("items");
        if(entries==null)return;
        for(int i=0;i<entries.length();i++) {
            JSONObject x=entries.optJSONObject(i);
            if(x==null)continue;
            String name=x.optString("file");
            if(name.matches("[0-9a-fA-F-]{36}\\.(pdf|img)"))new File(directory,name).delete();
        }
    }

    public synchronized String info(String number) {
        JSONObject result=new JSONObject();
        try {
            JSONObject raw=validNumber(number)?all().optJSONObject(number):null;
            if(raw!=null) result=new JSONObject(raw.toString());
            result.remove("items"); // Do not expose private filenames.
            result.put("number",number).put("status",status);
        } catch(Exception ignored){}
        return result.toString();
    }

    public synchronized void remove(String number) {
        if(!validNumber(number))return;
        JSONObject idx=all(),old=idx.optJSONObject(number);
        idx.remove(number);
        if(prefs.edit().putString("scores",idx.toString()).commit()&&old!=null)deleteEntries(old);
        status="Noterna för sång "+number+" togs bort.";
        notifyUi();
    }

    public synchronized byte[] pageBytes(String number, int page, int requestedWidth) {
        if(!validNumber(number) || page<0 || requestedWidth<240 || requestedWidth>2600)
            return null;
        JSONObject info=all().optJSONObject(number);
        if(info==null || page>=info.optInt("count"))return null;
        JSONArray entries=info.optJSONArray("items");
        if(entries==null)return null;
        int index=page;
        try {
            for(int i=0;i<entries.length();i++) {
                JSONObject entry=entries.optJSONObject(i);
                if(entry==null)return null;
                int pages=entry.optInt("pages",1);
                if(index>=pages){index-=pages;continue;}
                String name=entry.optString("file");
                if(!name.matches("[0-9a-fA-F-]{36}\\.(pdf|img)"))return null;
                File f=new File(directory,name);
                if(!f.isFile())return null;
                Bitmap bitmap;
                if("pdf".equals(entry.optString("type"))) {
                    try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(f,ParcelFileDescriptor.MODE_READ_ONLY);
                        PdfRenderer pdf=new PdfRenderer(fd);
                        PdfRenderer.Page pdfPage=pdf.openPage(index)) {
                        int w=requestedWidth;
                        int h=Math.max(1,(int)Math.round((double)pdfPage.getHeight()*w/pdfPage.getWidth()));
                        if(h>4200){w=Math.max(100,(int)(w*4200.0/h));h=4200;}
                        bitmap=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);
                        bitmap.eraseColor(Color.WHITE);
                        pdfPage.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                    }
                } else {
                    BitmapFactory.Options bounds=new BitmapFactory.Options();
                    bounds.inJustDecodeBounds=true;
                    BitmapFactory.decodeFile(f.getAbsolutePath(),bounds);
                    int sample=1;
                    while(bounds.outWidth/sample>requestedWidth*2 || bounds.outHeight/sample>5200)
                        sample*=2;
                    BitmapFactory.Options options=new BitmapFactory.Options();
                    options.inSampleSize=sample;
                    Bitmap original=BitmapFactory.decodeFile(f.getAbsolutePath(),options);
                    if(original==null)return null;
                    int w=original.getWidth(),h=original.getHeight();
                    double ratio=Math.min(1.0,Math.min((double)requestedWidth/w,4200.0/h));
                    int dw=Math.max(1,(int)Math.round(w*ratio)),dh=Math.max(1,(int)Math.round(h*ratio));
                    bitmap=(dw==w&&dh==h)?original:Bitmap.createScaledBitmap(original,dw,dh,true);
                    if(bitmap!=original)original.recycle();
                }
                ByteArrayOutputStream out=new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.JPEG,88,out);
                bitmap.recycle();
                return out.toByteArray();
            }
        } catch(Exception e){android.util.Log.w("SionsScore","Kunde inte visa notsida",e);}
        return null;
    }

    public String pageData(String number,int page) {
        byte[] bytes=pageBytes(number,page,1500);
        return bytes==null?"":"data:image/jpeg;base64,"+Base64.encodeToString(bytes,Base64.NO_WRAP);
    }
}
