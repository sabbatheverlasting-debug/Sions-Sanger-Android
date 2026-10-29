package se.sionssanger.app;

import android.app.Activity;
import android.content.*;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import android.widget.Toast;
import org.json.*;
import java.io.*;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.zip.*;

/** Offline, user-selected ZIP backup of all local reading and media data. */
public final class SionsBackup {
    public static final int SAVE=1250, RESTORE=1251;
    private static final long MAX_ENTRY=150L*1024*1024, MAX_TOTAL=3L*1024*1024*1024;
    private final Activity activity;
    private final WebView web;
    private final Handler main=new Handler(Looper.getMainLooper());
    private volatile boolean busy=false;
    private String pendingWebState;

    public SionsBackup(Activity a,WebView w){activity=a;web=w;}
    private void say(String message){
        main.post(()->{
            Toast.makeText(activity,message,Toast.LENGTH_LONG).show();
            web.evaluateJavascript("window.sionsBackupStatus&&window.sionsBackupStatus("+JSONObject.quote(message)+")",null);
        });
    }
    public void export(String state){
        if(busy)return;
        try {
            JSONObject parsed=new JSONObject(state);
            if(parsed.optInt("schema")!=1||parsed.optJSONObject("webStorage")==null)throw new JSONException("Bad state");
            pendingWebState=state;
            main.post(()->{
                Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("application/zip");
                i.putExtra(Intent.EXTRA_TITLE,"Sions_Sanger_komplett_"+new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT).format(new Date())+".zip");
                try{activity.startActivityForResult(i,SAVE);}catch(Exception e){pendingWebState=null;say("Kunde inte öppna filväljaren.");}
            });
        }catch(Exception e){say("Säkerhetskopian kunde inte förberedas.");}
    }
    public void importBackup(){
        if(busy)return;
        main.post(()->{
            Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("application/zip");
            try{activity.startActivityForResult(i,RESTORE);}catch(Exception e){say("Kunde inte öppna ZIP-väljaren.");}
        });
    }
    public void result(int code,int result,Intent data){
        if(result!=Activity.RESULT_OK||data==null||data.getData()==null){if(code==SAVE)pendingWebState=null;return;}
        if(busy)return;
        Uri uri=data.getData();
        if(code==SAVE){
            String state=pendingWebState;pendingWebState=null;
            if(state==null)return;
            busy=true;
            new Thread(()->{try{write(uri,state);say("Komplett ZIP-säkerhetskopia sparad och verifierad.");}
                catch(Exception e){say("Säkerhetskopian misslyckades: "+shortError(e));}
                finally{busy=false;}},"sions-backup-export").start();
        }else if(code==RESTORE){
            busy=true;
            new Thread(()->{try{read(uri);}
                catch(Exception e){say("Återställningen avbröts: "+shortError(e));}
                finally{busy=false;}},"sions-backup-restore").start();
        }
    }
    private static String shortError(Exception e){
        String v=e.getMessage();return v==null?"kontrollera ZIP-filen":v.substring(0,Math.min(140,v.length()));
    }
    private JSONObject prefs(String name)throws JSONException{
        JSONObject result=new JSONObject();
        for(Map.Entry<String,?> entry:activity.getSharedPreferences(name,0).getAll().entrySet()){
            Object v=entry.getValue();
            if(v instanceof String||v instanceof Boolean||v instanceof Number)result.put(entry.getKey(),v);
        }
        return result;
    }
    private static String safeFile(String filename,String type){
        String suffix=type.equals("audio")?"(mp3|opus|ogg|m4a|wav|aac|flac|mid|midi)":"(pdf|img|musicxml)";
        return filename!=null&&filename.matches("[0-9a-fA-F-]{36}\\."+suffix)?filename:null;
    }
    private static void put(ZipOutputStream zip,String name,InputStream input)throws IOException{
        zip.putNextEntry(new ZipEntry(name));
        byte[] buffer=new byte[32768];int count;
        while((count=input.read(buffer))!=-1)zip.write(buffer,0,count);
        zip.closeEntry();
    }
    private void write(Uri uri,String state)throws Exception{
        JSONObject manifest=new JSONObject()
            .put("format","SionsSangerCompleteBackup").put("version",1)
            .put("createdAt",System.currentTimeMillis()).put("web",new JSONObject(state))
            .put("audioPrefs",prefs("sions-audio-v1")).put("scorePrefs",prefs("sions-scores-v1"));
        int fileCount=0;
        try(OutputStream output=activity.getContentResolver().openOutputStream(uri,"w")){
            if(output==null)throw new IOException("Kunde inte skapa ZIP-filen");
            try(ZipOutputStream zip=new ZipOutputStream(new BufferedOutputStream(output))){
                put(zip,"backup.json",new ByteArrayInputStream(manifest.toString().getBytes("UTF-8")));
                for(String type:new String[]{"audio","scores"}){
                    File dir=new File(activity.getFilesDir(),"sions-"+type);
                    File[] files=dir.listFiles();if(files==null)continue;
                    for(File file:files){
                        if(!file.isFile()||safeFile(file.getName(),type)==null)continue;
                        if(file.length()>MAX_ENTRY)throw new IOException("För stor mediafil");
                        try(InputStream input=new FileInputStream(file)){put(zip,type+"/"+file.getName(),input);}
                        fileCount++;
                    }
                }
            }
        }
        // Re-read every compressed byte to detect truncation and CRC errors.
        try(InputStream input=activity.getContentResolver().openInputStream(uri);
            ZipInputStream zip=new ZipInputStream(new BufferedInputStream(input))){
            boolean found=false;int entries=0;long total=0;byte[] b=new byte[32768];ZipEntry entry;
            while((entry=zip.getNextEntry())!=null){
                if(entry.getName().equals("backup.json"))found=true;
                int n;while((n=zip.read(b))!=-1){total+=n;if(total>MAX_TOTAL)throw new IOException("Säkerhetskopian är för stor");}
                entries++;
            }
            if(!found||entries<fileCount+1)throw new IOException("Säkerhetskopian är ofullständig");
        }
    }
    private static byte[] small(InputStream in,int limit)throws IOException{
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        byte[] b=new byte[16384];int n;while((n=in.read(b))!=-1){
            if(out.size()+n>limit)throw new IOException("Ogiltig eller för stor backup.json");out.write(b,0,n);
        }
        return out.toByteArray();
    }
    private static void copy(File from,File to)throws IOException{
        try(InputStream in=new FileInputStream(from);OutputStream out=new FileOutputStream(to)){
            byte[] b=new byte[32768];int n;while((n=in.read(b))!=-1)out.write(b,0,n);
        }
    }
    private static JSONObject asObject(JSONObject obj,String key)throws JSONException{
        return new JSONObject(obj.optString(key,"{}"));
    }
    private static void mergePreferences(SharedPreferences target,JSONObject source)throws JSONException{
        SharedPreferences.Editor edit=target.edit();Map<String,?> old=target.getAll();
        Iterator<String> it=source.keys();
        while(it.hasNext()){
            String k=it.next();if(old.containsKey(k))continue;
            Object v=source.opt(k);
            if(v instanceof Boolean)edit.putBoolean(k,(Boolean)v);
            else if(v instanceof Integer)edit.putInt(k,(Integer)v);
            else if(v instanceof Long)edit.putLong(k,(Long)v);
            else if(v instanceof Double)edit.putFloat(k,((Double)v).floatValue());
            else if(v instanceof String)edit.putString(k,(String)v);
        }
        if(!edit.commit())throw new JSONException("Kunde inte spara inställningar");
    }
    private void read(Uri uri)throws Exception{
        File stage=new File(activity.getCacheDir(),"sions-restore-"+UUID.randomUUID());
        if(!stage.mkdirs())throw new IOException("Kunde inte förbereda återställning");
        try{
            JSONObject manifest=null;Set<String> paths=new HashSet<>();long total=0;int entries=0;
            try(InputStream input=activity.getContentResolver().openInputStream(uri)){
                if(input==null)throw new IOException("Kunde inte öppna ZIP-filen");
                try(ZipInputStream zip=new ZipInputStream(new BufferedInputStream(input))){
                    ZipEntry item;byte[] buffer=new byte[32768];
                    while((item=zip.getNextEntry())!=null){
                        String path=item.getName();
                        if(!paths.add(path)||++entries>1100||item.isDirectory())throw new IOException("Ogiltiga ZIP-poster");
                        if(path.equals("backup.json")){
                            if(manifest!=null)throw new IOException("Dubbla manifest");
                            manifest=new JSONObject(new String(small(zip,12*1024*1024),"UTF-8"));
                        }else{
                            String type=path.startsWith("audio/")?"audio":path.startsWith("scores/")?"scores":null;
                            String name=type==null?null:path.substring(type.length()+1);
                            if(type==null||safeFile(name,type)==null)throw new IOException("Okänd eller osäker ZIP-post");
                            File dir=new File(stage,type);dir.mkdirs();
                            try(OutputStream out=new FileOutputStream(new File(dir,name))){
                                long size=0;int n;while((n=zip.read(buffer))!=-1){
                                    size+=n;total+=n;
                                    if(size>MAX_ENTRY||total>MAX_TOTAL)throw new IOException("ZIP-innehållet är för stort");
                                    out.write(buffer,0,n);
                                }
                            }
                        }
                        zip.closeEntry();
                    }
                }
            }
            if(manifest==null||!manifest.optString("format").equals("SionsSangerCompleteBackup")||manifest.optInt("version")!=1)
                throw new IOException("Inte en komplett Sions Sånger-säkerhetskopia");
            JSONObject webData=manifest.optJSONObject("web"),audioPrefs=manifest.optJSONObject("audioPrefs"),scorePrefs=manifest.optJSONObject("scorePrefs");
            if(webData==null||webData.optInt("schema")!=1||webData.optJSONObject("webStorage")==null||audioPrefs==null||scorePrefs==null)
                throw new IOException("ZIP-filen saknar obligatoriskt innehåll");
            JSONObject incomingAudio=asObject(audioPrefs,"index"),incomingScores=asObject(scorePrefs,"scores");
            JSONObject currentAudio=asObject(prefs("sions-audio-v1"),"index"),currentScores=asObject(prefs("sions-scores-v1"),"scores");
            Map<String,String> audioCopies=new HashMap<>(),scoreCopies=new HashMap<>();
            Iterator<String> ai=incomingAudio.keys();
            while(ai.hasNext()){
                String key=ai.next();JSONObject record=incomingAudio.optJSONObject(key);
                if(record==null)throw new IOException("Fel i ljudregistret");
                String file=safeFile(record.optString("file"),"audio");
                if(file==null||!new File(stage,"audio/"+file).isFile())throw new IOException("Ljudfil saknas i ZIP: "+key);
                if(!audioCopies.containsKey(file))audioCopies.put(file,UUID.randomUUID()+file.substring(file.lastIndexOf('.')));
                String destKey=currentAudio.has(key)?"unassigned:"+UUID.randomUUID():key;
                JSONObject updated=new JSONObject(record.toString()).put("file",audioCopies.get(file)).put("number",destKey);
                currentAudio.put(destKey,updated);
            }
            Iterator<String> si=incomingScores.keys();
            while(si.hasNext()){
                String key=si.next();JSONObject record=incomingScores.optJSONObject(key);
                if(record==null)throw new IOException("Fel i notregistret");
                JSONArray sheets=record.optJSONArray("items");if(sheets==null)throw new IOException("Notfiler saknas");
                boolean add=!currentScores.has(key);JSONArray copies=new JSONArray();
                for(int j=0;j<sheets.length();j++){
                    JSONObject sheet=sheets.optJSONObject(j);if(sheet==null)throw new IOException("Ogiltig notpost");
                    String filename=safeFile(sheet.optString("file"),"scores");
                    if(filename==null||!new File(stage,"scores/"+filename).isFile())throw new IOException("Notfil saknas: "+key);
                    JSONObject updated=new JSONObject(sheet.toString());
                    if(add){
                        if(!scoreCopies.containsKey(filename))scoreCopies.put(filename,UUID.randomUUID()+filename.substring(filename.lastIndexOf('.')));
                        updated.put("file",scoreCopies.get(filename));
                    }
                    copies.put(updated);
                }
                if(add)currentScores.put(key,new JSONObject(record.toString()).put("items",copies));
            }
            File audioDir=new File(activity.getFilesDir(),"sions-audio"),scoreDir=new File(activity.getFilesDir(),"sions-scores");
            audioDir.mkdirs();scoreDir.mkdirs();ArrayList<File> addedFiles=new ArrayList<>();
            try{
                for(Map.Entry<String,String> e:audioCopies.entrySet()){
                    File dest=new File(audioDir,e.getValue());copy(new File(stage,"audio/"+e.getKey()),dest);addedFiles.add(dest);
                }
                for(Map.Entry<String,String> e:scoreCopies.entrySet()){
                    File dest=new File(scoreDir,e.getValue());copy(new File(stage,"scores/"+e.getKey()),dest);addedFiles.add(dest);
                }
                SharedPreferences audio=activity.getSharedPreferences("sions-audio-v1",0),scores=activity.getSharedPreferences("sions-scores-v1",0);
                if(!audio.edit().putString("index",currentAudio.toString()).commit())throw new IOException("Kunde inte spara ljudindex");
                if(!scores.edit().putString("scores",currentScores.toString()).commit())throw new IOException("Kunde inte spara notindex");
                mergePreferences(audio,audioPrefs);mergePreferences(scores,scorePrefs);
            }catch(Exception e){for(File f:addedFiles)f.delete();throw e;}
            String web=webData.toString();
            main.post(()->webViewMerge(web));
        }finally{removeTree(stage);}
    }
    private void webViewMerge(String payload){
        web.evaluateJavascript("window.sionsBackupMerge("+JSONObject.quote(payload)+")",value->{
            if(value==null||value.contains("ERROR:"))say("Mediefilerna återställdes, men textbiblioteket kunde inte slutföras. Importera ZIP igen.");
            else say("Återställning klar. Sånger, musik, noter och inställningar har lagts till.");
        });
    }
    private static void removeTree(File dir){
        if(dir.isDirectory()){File[] items=dir.listFiles();if(items!=null)for(File child:items)removeTree(child);}dir.delete();
    }
}
