package se.sionssanger.app;

import android.app.Activity;
import android.content.*;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import org.json.*;
import java.io.*;
import java.util.*;
import java.util.regex.*;
import java.util.zip.*;

/** Private local audio library, accessed only via the Android document picker. */
public final class SionsAudio {
 public static final int PICK=1240;
 private final Activity activity;
 private final SharedPreferences prefs;
 private final File folder;
 private final Handler ui=new Handler(Looper.getMainLooper());
 private MediaPlayer player;
 private File midiTemp;
 private boolean midiTempOrgan;
 private volatile String midiInstrument;
 private volatile String current="",error="",importStatus="";
 private volatile boolean busy,ready;
 private volatile long position,duration;
 private volatile boolean playing;
 private int generation;
 private volatile boolean targetTv;
 private long lastBroadcast;
 private boolean announcedTv;
 private String importAssign="";
 public SionsAudio(Activity a){activity=a;prefs=a.getSharedPreferences("sions-audio-v1",0);folder=new File(a.getFilesDir(),"sions-audio");folder.mkdirs();targetTv=prefs.getBoolean("targetTv",false);midiInstrument=prefs.getString("midiInstrument","piano");ui.post(tick);}
 private final Runnable tick=new Runnable(){public void run(){if(player!=null&&ready)try{position=player.getCurrentPosition();duration=player.getDuration();playing=player.isPlaying();}catch(Exception ignored){}if(System.currentTimeMillis()-lastBroadcast>550){lastBroadcast=System.currentTimeMillis();publishAudio();}ui.postDelayed(this,300);}};
 public void pick(String assigned){ui.post(()->{if(busy)return;importAssign=assigned.matches("\\d+[a-z]?")?assigned:"";Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"audio/*","audio/midi","audio/x-midi","application/x-midi","application/zip","application/x-zip-compressed","application/octet-stream"});i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);try{activity.startActivityForResult(i,PICK);}catch(Exception e){error="Kunde inte öppna filväljaren";}});}
 public void result(int result,Intent data){if(result!=Activity.RESULT_OK||data==null)return;List<Uri> uris=new ArrayList<>();if(data.getClipData()!=null){for(int n=0;n<data.getClipData().getItemCount();n++)uris.add(data.getClipData().getItemAt(n).getUri());}else if(data.getData()!=null)uris.add(data.getData());if(busy)return;final String assigned=importAssign;busy=true;importStatus="Importerar ljud…";new Thread(()->{int count=0;List<String> issues=new ArrayList<>();try{for(Uri u:uris){String name=name(u);try(InputStream raw=activity.getContentResolver().openInputStream(u)){if(raw==null)continue;if(name.toLowerCase(Locale.ROOT).endsWith(".zip")){if(!assigned.isEmpty())throw new IOException("Välj en ljudfil vid sången. Importera ZIP från Ljudbibliotek.");try(ZipInputStream z=new ZipInputStream(new BufferedInputStream(raw))){ZipEntry e;int entries=0;while((e=z.getNextEntry())!=null){if(++entries>1000)throw new IOException("För många filer i ZIP");if(!e.isDirectory()&&isAudio(e.getName()))try{if(save(z,e.getName(),""))count++;}catch(Exception ex){issues.add(new File(e.getName()).getName());}z.closeEntry();}}}else if(isAudio(name)){if(save(raw,name,uris.size()==1?assigned:""))count++;}else issues.add(name);}}importStatus=count+" ljudfiler importerade"+(issues.isEmpty()?"":" · "+issues.size()+" filer kunde inte importeras");}catch(Exception e){importStatus=count+" importerade · importen avbröts: "+e.getMessage();}finally{busy=false;}},"sions-audio-import").start();}
 private String name(Uri u){try(android.database.Cursor c=activity.getContentResolver().query(u,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst())return c.getString(0);}catch(Exception ignored){}return "audio";}
 private boolean isAudio(String name){return name.toLowerCase(Locale.ROOT).matches(".*\\.(mp3|opus|ogg|m4a|wav|aac|flac|mid|midi)$");}
 private boolean save(InputStream in,String original,String forced)throws Exception{
  String name=new File(original).getName();
  int dot=name.lastIndexOf('.');if(dot<0||!isAudio(name))throw new IOException("Unsupported audio file");
  String stem=name.substring(0,dot),ext=name.substring(dot).toLowerCase(Locale.ROOT);
  // Recognize explicit song-number prefixes, including "Sions Sånger 055".
  // Do not interpret arbitrary digits in the middle of a filename as a song.
  Matcher m=Pattern.compile(
      "^(?:(?:sions?[-_. ]*(?:sånger|sanger|songs)|ss)[-_. ]*(?:(?:nr|nummer|no)\\.?[-_. ]*)?|(?:sång|sang|psalm|hymn|nr|nummer|no)[ .:#_-]*)?0*(\\d{1,4})([a-zA-Z]?)(?=$|[\\s._):\\]-])(?:[\\s._):\\]-]+(.*))?$",
      Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE).matcher(stem);
  boolean numbered=m.matches();
  String guessed=numbered?Integer.toString(Integer.parseInt(m.group(1)))+m.group(2).toLowerCase(Locale.ROOT):"";
  String title=(numbered&&m.group(3)!=null&&!m.group(3).isEmpty()?m.group(3):stem).replace('_',' ').trim();
  boolean midi=ext.equals(".mid")||ext.equals(".midi");
  String number=!forced.isEmpty()?forced:guessed;
  if(midi&&!number.isEmpty())number="midi:"+number;
  File temp=File.createTempFile("import-",".tmp",folder);long bytes=0;
  try(OutputStream out=new FileOutputStream(temp)){byte[] b=new byte[32768];int n;while((n=in.read(b))!=-1){bytes+=n;if(bytes>100L*1024*1024)throw new IOException("Ljudfilen är för stor");out.write(b,0,n);}}catch(Exception e){temp.delete();throw e;}
  if(bytes==0){temp.delete();throw new IOException("Tom ljudfil");}
  File target=new File(folder,java.util.UUID.randomUUID()+ext);
  if(!temp.renameTo(target)){temp.delete();throw new IOException("Kunde inte spara ljudet");}
  synchronized(this){
   JSONObject index=index();
   // Never silently replace an earlier audio link on bulk import.
   // Conflicts remain available for explicit user review and manual linking.
   if(number.isEmpty()||index.optJSONObject(number)!=null)number="unassigned:"+java.util.UUID.randomUUID();
   JSONObject item=new JSONObject().put("number",number).put("title",title)
     .put("originalName",name).put("file",target.getName()).put("type",midi?"midi":"audio");
   index.put(number,item);
   if(!prefs.edit().putString("index",index.toString()).commit()){
    target.delete();throw new IOException("Kunde inte spara registret");
   }
  }
  return true;
 }
 private synchronized JSONObject index(){try{return new JSONObject(prefs.getString("index","{}"));}catch(Exception e){return new JSONObject();}}
 public void assign(String number,String source){if(!number.matches("\\d+[a-z]?"))return;synchronized(this){try{JSONObject idx=index(),item=idx.optJSONObject(source);if(item==null)return;boolean isMidi=item.optString("type").equals("midi")||item.optString("file").matches("(?i).*\\.(mid|midi)$");String dest=isMidi?"midi:"+number:number;JSONObject copy=new JSONObject(item.toString()).put("number",dest);idx.put(dest,copy);if(source.startsWith("unassigned:"))idx.remove(source);prefs.edit().putString("index",idx.toString()).apply();}catch(Exception ignored){}}}
 public String instrument(){return midiInstrument;}
 public void instrument(String selection){if(!selection.equals("piano")&&!selection.equals("organ"))return; midiInstrument=selection;prefs.edit().putString("midiInstrument",selection).apply();}
 public String list(){return index().toString();}
 public String status(){try{return new JSONObject().put("midiInstrument",midiInstrument).put("targetTv",targetTv).put("number",current).put("playing",playing).put("ready",ready).put("position",position/1000.0).put("duration",duration/1000.0).put("error",error).put("busy",busy).put("importStatus",importStatus).toString();}catch(Exception e){return "{}";}}
 public void play(String number){ui.post(()->{
  error="";JSONObject item=index().optJSONObject(number);
  if(item==null){error="Importera musik till den här sången först";return;}
  final boolean midi=item.optString("type").equals("midi")||item.optString("file").matches("(?i).*\\.(mid|midi)$");
  try{
   boolean organ="organ".equals(midiInstrument);
   if(player!=null&&ready&&current.equals(number)&&(!midi||midiTempOrgan==organ)){
    player.start();playing=true;publishAudio();return;
   }
   release();int ticket=++generation;current=number;position=0;duration=0;
   player=new MediaPlayer();MediaPlayer p=player;
   File input=new File(folder,item.getString("file"));
   if(midi){
    midiTempOrgan=organ;
    midiTemp=SionsMidi.playbackCopy(input,activity.getCacheDir(),organ);
    input=midiTemp;
   }
   p.setDataSource(input.getAbsolutePath());
   p.setOnPreparedListener(mp->{
    if(ticket!=generation)return;
    ready=true;duration=mp.getDuration();
    boolean silent=targetTv&&!midi;
    mp.setVolume(silent?0f:1f,silent?0f:1f);
    mp.start();playing=true;
   });
   p.setOnCompletionListener(mp->{playing=false;position=duration;});
   p.setOnErrorListener((mp,what,extra)->{
    error=midi?"MIDI-filen kunde inte spelas på enheten. Kontrollera formatet.":"Ljudfilen kunde inte spelas. Prova MP3-versionen.";
    playing=false;ready=false;return true;
   });
   p.prepareAsync();
  }catch(Exception e){error=midi?"MIDI-filen kunde inte förberedas.":"Kunde inte öppna ljudfilen";release();}
 });}
 public void target(boolean enabled){ui.post(()->{targetTv=enabled;prefs.edit().putBoolean("targetTv",enabled).apply();if(player!=null)try{boolean silent=enabled&&!current.startsWith("midi:");player.setVolume(silent?0f:1f,silent?0f:1f);}catch(Exception ignored){}publishAudio();});}
 private void publishAudio(){try{
  JSONObject item=index().optJSONObject(current);
  Intent i=new Intent("se.churchshow.tvbridge.AUDIO").setComponent(new ComponentName("se.churchshow.tvbridge","se.churchshow.tvbridge.SlideReceiver"));
  boolean midi=item!=null&&(item.optString("type").equals("midi")||item.optString("file").matches("(?i).*\\.(mid|midi)$"));boolean enabled=targetTv&&item!=null&&ready&&!midi;
  if(!enabled&&!announcedTv)return;
  JSONObject meta=new JSONObject().put("enabled",enabled).put("track",item==null?"":item.optString("file")).put("playing",playing).put("position",position/1000.0).put("duration",duration/1000.0);
  if(enabled){Uri uri=new Uri.Builder().scheme("content").authority(activity.getPackageName()+".audio").appendPath(item.getString("file")).build();activity.grantUriPermission("se.churchshow.tvbridge",uri,Intent.FLAG_GRANT_READ_URI_PERMISSION);i.setData(uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);}
  i.putExtra("audio",meta.toString());activity.sendBroadcast(i);announcedTv=enabled;
 }catch(Exception ignored){}}
 public void stop(){ui.post(()->{release();current="";position=0;duration=0;error="";publishAudio();});}
 public void pause(){ui.post(()->{if(player!=null&&ready)try{player.pause();position=player.getCurrentPosition();playing=false;publishAudio();}catch(Exception ignored){}});}
 public void seek(String number,double seconds){ui.post(()->{if(player!=null&&ready&&current.equals(number)&&Double.isFinite(seconds)&&seconds>=0)try{player.seekTo((int)Math.min(duration,seconds*1000));position=(long)Math.min(duration,seconds*1000);}catch(Exception ignored){}});}
 public String cues(String number){return prefs.getString("cues-"+number,"{}");}
 public void cue(String number,int verse,double seconds){if(!number.matches("\\d+[a-z]?")||verse<0||verse>200||!Double.isFinite(seconds)||seconds<0)return;synchronized(this){try{JSONObject c=new JSONObject(cues(number));c.put(Integer.toString(verse),seconds);prefs.edit().putString("cues-"+number,c.toString()).apply();}catch(Exception ignored){}}}
 public void clearCues(String number){if(number.matches("\\d+[a-z]?"))prefs.edit().remove("cues-"+number).apply();}
 private void release(){generation++;ready=false;playing=false;if(player!=null){try{player.release();}catch(Exception ignored){}player=null;}if(midiTemp!=null){midiTemp.delete();midiTemp=null;}}
 public void destroy(){ui.removeCallbacksAndMessages(null);targetTv=false;publishAudio();release();}
}
