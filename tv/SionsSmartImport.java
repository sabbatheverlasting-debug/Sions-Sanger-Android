package se.sionssanger.app;

import android.app.*;
import android.content.*;
import android.database.Cursor;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.webkit.WebView;
import android.widget.EditText;
import org.json.*;
import java.io.*;
import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.*;
import java.util.zip.*;

/** A single local document picker. It detects JSON, audio, scores and backup/mixed ZIPs. */
public final class SionsSmartImport {
    public static final int PICK=1252;
    private static final long MAX_PART=100L*1024*1024, MAX_ARCHIVE=750L*1024*1024;
    private final Activity activity;
    private final WebView web;
    private final SionsAudio audio;
    private final SionsScore score;
    private final SionsBackup backup;
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final LinkedHashMap<String,String> titles=new LinkedHashMap<>();
    private volatile boolean busy;

    public SionsSmartImport(Activity a,WebView w,SionsAudio audio,SionsScore score,SionsBackup backup){
        activity=a;web=w;this.audio=audio;this.score=score;this.backup=backup;
    }
    private void message(String text){
        ui.post(()->web.evaluateJavascript("window.sionsSmartImportStatus&&window.sionsSmartImportStatus("+JSONObject.quote(text)+")",null));
    }
    private static String canonical(String name){
        String normalized=Normalizer.normalize(name==null?"":name,Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}","").toLowerCase(Locale.ROOT)
            .replaceAll("\\.(pdf|jpg|jpeg|png|webp|musicxml|mxl|xml)$","")
            .replaceAll("[^a-z0-9]+"," ").trim();
    }
    private void loadTitles(String json){
        titles.clear();
        try{
            JSONArray arr=new JSONArray(json);
            for(int i=0;i<Math.min(arr.length(),3000);i++){
                JSONObject v=arr.optJSONObject(i);if(v==null)continue;
                String number=v.optString("number"), title=canonical(v.optString("title"));
                if(number.matches("[1-9][0-9]{0,3}[a-z]?")&&!title.isEmpty()){
                    if(titles.containsKey(title)&&!titles.get(title).equals(number))titles.put(title,"");
                    else titles.put(title,number);
                }
            }
        }catch(Exception ignored){}
    }
    public void pick(String json){
        if(busy)return;
        ui.post(()->{
            loadTitles(json);
            Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);
            try{activity.startActivityForResult(intent,PICK);}
            catch(Exception e){message("Kunde inte öppna filväljaren.");}
        });
    }
    public void result(int resultCode,Intent data){
        if(resultCode!=Activity.RESULT_OK||data==null||busy)return;
        ArrayList<Uri> uris=new ArrayList<>();
        if(data.getClipData()!=null)for(int i=0;i<data.getClipData().getItemCount();i++)
            uris.add(data.getClipData().getItemAt(i).getUri());
        else if(data.getData()!=null)uris.add(data.getData());
        if(uris.isEmpty())return;
        busy=true;message("Undersöker filformat och sångnummer…");
        new Thread(()->{
            try{process(uris);}catch(Exception e){message("Importen stoppades: "+String.valueOf(e.getMessage()));}
            finally{busy=false;}
        },"sions-smart-import").start();
    }
    private String name(Uri uri){
        try(Cursor c=activity.getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){
            if(c!=null&&c.moveToFirst())return c.getString(0);
        }catch(Exception ignored){}
        if("file".equals(uri.getScheme())&&uri.getPath()!=null)return new File(uri.getPath()).getName();
        return "okand-fil";
    }
    private String kind(String name,Uri uri){
        String n=name.toLowerCase(Locale.ROOT);
        if(n.matches(".*\\.(mp3|opus|ogg|m4a|aac|wav|flac|mid|midi)$"))return "audio";
        if(n.endsWith(".json"))return "json";
        if(n.endsWith(".zip"))return "zip";
        if(n.matches(".*\\.(pdf|png|jpg|jpeg|webp|musicxml|mxl|xml)$"))return "score";
        try(InputStream raw=activity.getContentResolver().openInputStream(uri)){
            if(raw==null)return "unknown";
            byte[] b=new byte[16];int len=raw.read(b);
            if(len>=4){
                if(b[0]=='P'&&b[1]=='K')return "zip";
                if(b[0]=='%'&&b[1]=='P'&&b[2]=='D'&&b[3]=='F')return "score";
                if(b[0]=='O'&&b[1]=='g'&&b[2]=='g'&&b[3]=='S')return "audio";
                if(b[0]=='{'||b[0]=='[')return "json";
            }
        }catch(Exception ignored){}
        String mime=activity.getContentResolver().getType(uri);
        return mime!=null&&mime.startsWith("audio/")?"audio":mime!=null&&mime.startsWith("image/")?"score":"unknown";
    }
    private String songNumber(String filename){
        String stem=new File(filename).getName().replaceFirst("(?i)\\.(pdf|png|jpg|jpeg|webp|xml|mxl|musicxml)$","");
        Matcher number=Pattern.compile("(?iu)^(?:(?:sions?[-_. ]*(?:sånger|sanger|songs)|ss)[-_. ]*(?:(?:nr|nummer|no)\\.?[-_. ]*)?|(?:sång|sang|psalm|hymn|nr|nummer|no)[ .:#_-]*)?0*([1-9]\\d{0,3})([a-z]?)(?=$|[\\s._):\\]-])").matcher(stem);
        if(number.find())return number.group(1)+number.group(2).toLowerCase(Locale.ROOT);
        String canon=canonical(stem);
        String exact=titles.get(canon);
        if(exact!=null&&!exact.isEmpty())return exact;
        String found=null;
        for(Map.Entry<String,String> e:titles.entrySet()){
            if(!e.getValue().isEmpty()&&(canon.equals(e.getKey())||canon.startsWith(e.getKey()+" "))){
                if(found!=null&&!found.equals(e.getValue()))return "";
                found=e.getValue();
            }
        }
        return found==null?"":found;
    }
    private String askNumber(String filename){
        AtomicReference<String> selected=new AtomicReference<>("");
        CountDownLatch ready=new CountDownLatch(1);
        ui.post(()->{
            final EditText field=new EditText(activity);
            field.setSingleLine(true);
            field.setHint("Sångnummer, t.ex. 55");
            field.setInputType(android.text.InputType.TYPE_CLASS_TEXT);
            new AlertDialog.Builder(activity).setTitle("Vilken sång hör noterna till?")
                .setMessage(filename+" saknar ett säkert sångnummer. Ange numret eller hoppa över filen.")
                .setView(field).setPositiveButton("Koppla", (dialog,which)->{
                    String v=field.getText().toString().trim().toLowerCase(Locale.ROOT);
                    if(v.matches("[1-9][0-9]{0,3}[a-z]?"))selected.set(v);
                    ready.countDown();
                }).setNegativeButton("Hoppa över",(dialog,which)->ready.countDown())
                .setOnCancelListener(dialog->ready.countDown()).show();
        });
        try{ready.await(120,TimeUnit.SECONDS);}catch(InterruptedException ex){Thread.currentThread().interrupt();}
        return selected.get();
    }
    private static String readText(InputStream stream,int max)throws IOException{
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[16384];int n;
        while((n=stream.read(b))!=-1){if(out.size()+n>max)throw new IOException("Textfil för stor");out.write(b,0,n);}
        return out.toString("UTF-8");
    }
    private static void delete(File file){
        if(file==null)return;
        if(file.isDirectory()){File[] children=file.listFiles();if(children!=null)for(File child:children)delete(child);}
        file.delete();
    }
    private boolean zipIsBackup(Uri uri)throws Exception{
        try(ZipInputStream zip=new ZipInputStream(new BufferedInputStream(activity.getContentResolver().openInputStream(uri)))){
            ZipEntry entry;int count=0;
            while((entry=zip.getNextEntry())!=null){
                if(++count>1500)throw new IOException("För många filer i ZIP");
                if(entry.getName().equals("backup.json")){
                    String body=readText(zip,12*1024*1024);
                    JSONObject obj=new JSONObject(body);
                    return obj.optString("format").equals("SionsSangerCompleteBackup")&&obj.optInt("version")==1;
                }
                zip.closeEntry();
            }
        }
        return false;
    }
    private static void appendJson(JSONArray json,String name,String text)throws JSONException{
        // The original existing JSON parser validates the actual hymn schema.
        json.put(new JSONObject().put("name",name).put("text",text));
    }
    private static File tempDir(File root)throws IOException{
        File file=new File(root,"sions-smart-"+UUID.randomUUID());
        if(!file.mkdirs())throw new IOException("Kunde inte förbereda ZIP-import");
        return file;
    }
    private static String scoreExt(String filename){
        String n=filename.toLowerCase(Locale.ROOT);
        if(n.matches(".*\\.(pdf|png|jpg|jpeg|webp|musicxml|mxl|xml)$"))return n.substring(n.lastIndexOf('.'));
        return "";
    }
    private void unpackZip(Uri uri,JSONArray json,ArrayList<Uri> audioFiles,
                           Map<String,List<Uri>> scores,List<File> staging,ArrayList<String> problems)throws Exception{
        File stage=tempDir(activity.getCacheDir());staging.add(stage);
        boolean hasAudio=false;int count=0;long total=0;
        try(ZipInputStream zip=new ZipInputStream(new BufferedInputStream(activity.getContentResolver().openInputStream(uri)))){
            ZipEntry e;
            while((e=zip.getNextEntry())!=null){
                if(e.isDirectory()){zip.closeEntry();continue;}
                if(++count>1500)throw new IOException("ZIP innehåller för många filer");
                String raw=e.getName();
                if(raw.startsWith("__MACOSX/")){zip.closeEntry();continue;}
                String filename=new File(raw).getName(),n=filename.toLowerCase(Locale.ROOT);
                if(n.isEmpty()){zip.closeEntry();continue;}
                if(n.endsWith(".json")){
                    String data=readText(zip,10*1024*1024);
                    total+=data.length();appendJson(json,filename,data);
                }else if(n.matches(".*\\.(mp3|opus|ogg|m4a|aac|wav|flac|mid|midi)$")){
                    hasAudio=true;
                    byte[] b=new byte[16384];int x;long part=0;
                    while((x=zip.read(b))!=-1){part+=x;total+=x;if(part>MAX_PART||total>MAX_ARCHIVE)throw new IOException("För mycket ljud i ZIP");}
                }else{
                    String ext=scoreExt(filename);
                    if(!ext.isEmpty()){
                        String number=songNumber(filename);
                        if(number.isEmpty())number=askNumber(filename);
                        if(!number.isEmpty()){
                            File output=new File(stage,UUID.randomUUID()+ext);
                            try(OutputStream out=new FileOutputStream(output)){
                                byte[] b=new byte[16384];int size;long part=0;
                                while((size=zip.read(b))!=-1){
                                    part+=size;total+=size;
                                    if(part>MAX_PART||total>MAX_ARCHIVE)throw new IOException("För stor notfil i ZIP");
                                    out.write(b,0,size);
                                }
                            }
                            scores.computeIfAbsent(number,k->new ArrayList<>()).add(Uri.fromFile(output));
                        }else problems.add("Notfil utan koppling: "+filename);
                    }
                }
                if(total>MAX_ARCHIVE)throw new IOException("ZIP-filen är för stor");
                zip.closeEntry();
            }
        }
        if(hasAudio)audioFiles.add(uri); // existing audio importer safely reads ZIP separately
    }
    private void process(List<Uri> uris)throws Exception{
        JSONArray json=new JSONArray();
        ArrayList<Uri> audios=new ArrayList<>();
        Map<String,List<Uri>> notes=new LinkedHashMap<>();
        ArrayList<File> staging=new ArrayList<>();
        ArrayList<String> problems=new ArrayList<>();
        try{
            int backups=0;
            for(Uri uri:uris){
                String filename=name(uri),kind=kind(filename,uri);
                if(kind.equals("zip")&&zipIsBackup(uri)){
                    backups++;backup.importSmart(uri);continue;
                }
                if(kind.equals("audio"))audios.add(uri);
                else if(kind.equals("json")){
                    try(InputStream in=activity.getContentResolver().openInputStream(uri)){
                        appendJson(json,filename,readText(in,10*1024*1024));
                    }
                }else if(kind.equals("score")){
                    String number=songNumber(filename);
                    if(number.isEmpty())number=askNumber(filename);
                    if(number.isEmpty())problems.add("Notfil utan koppling: "+filename);
                    else notes.computeIfAbsent(number,k->new ArrayList<>()).add(uri);
                }else if(kind.equals("zip"))unpackZip(uri,json,audios,notes,staging,problems);
                else problems.add("Okänt format: "+filename);
            }
            int scoreCount=0;
            for(Map.Entry<String,List<Uri>> item:notes.entrySet()){
                // Multiple photos can form one score; a PDF or XML must be selected alone.
                List<Uri> v=item.getValue();boolean singleDocument=false;
                for(Uri u:v)if(name(u).matches("(?i).*\\.(pdf|xml|musicxml|mxl)$"))singleDocument=true;
                if(singleDocument&&v.size()>1){problems.add("Flera notformat för sång "+item.getKey()+" – importera dem var för sig");continue;}
                score.importSmart(item.getKey(),v);scoreCount+=v.size();
            }
            if(!audios.isEmpty())audio.importSmart(audios);
            if(json.length()>0){
                final String serialized=json.toString();
                ui.post(()->web.evaluateJavascript("window.sionsSmartImportJson&&window.sionsSmartImportJson("+JSONObject.quote(serialized)+")",null));
            }
            String result=(backups>0?"Återställning av "+backups+" säkerhetskopia/-or startad. ":"")
                +(json.length()>0?json.length()+" JSON-fil(er) läses in. ":"")
                +(!audios.isEmpty()?"Musikimport startad. ":"")
                +(scoreCount>0?scoreCount+" notfil(er) hanterade. ":"")
                +(problems.isEmpty()?"":"Kontrollera: "+String.join("; ",problems));
            message(result.trim().isEmpty()?"Inga igenkända filer hittades. Öppna (?) för formatstöd.":result);
        }finally{for(File file:staging)delete(file);}
    }
}
