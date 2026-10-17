package se.sabbath.tv;

import android.app.*;
import android.content.*;
import android.graphics.Bitmap;
import android.os.*;
import android.view.*;
import android.webkit.WebView;
import android.widget.*;
import java.io.ByteArrayOutputStream;
import java.util.*;
import org.json.*;

/** Shared opt-in sender. Sends reader content only, never notes or the full screen. */
public final class TvLink implements Application.ActivityLifecycleCallbacks {
 private static final Map<Activity,TvLink> links=new WeakHashMap<>();
 private final Activity activity;
 private final Handler ui=new Handler(Looper.getMainLooper());
 private WebView web;
 private Button button;
 private boolean enabled,resumed=true,blank;
 private JSONObject current;
 private byte[] jpeg;
 private int page;
 private String lastBody="";
 private long lastSend;
 private final Runnable tick=new Runnable(){public void run(){
  if(enabled&&resumed&&!activity.isDestroyed()){
   if(web!=null)readWeb();else send();
  }
  if(!activity.isDestroyed())ui.postDelayed(this,1000);
 }};
 private TvLink(Activity a,WebView w){activity=a;web=w;
  a.getApplication().registerActivityLifecycleCallbacks(this);
  FrameLayout root=a.findViewById(android.R.id.content);
  button=new Button(a);button.setText("TV");button.setContentDescription("Sabbath TV – visa läsinnehåll");
  FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(-2,-2,Gravity.BOTTOM|Gravity.END);p.setMargins(12,12,12,96);
  root.addView(button,p);button.setOnClickListener(v->menu());ui.post(tick);
 }
 public static void attach(Activity a,WebView w){a.runOnUiThread(()->{if(!links.containsKey(a))links.put(a,new TvLink(a,w));});}
 public static void attach(Activity a){attach(a,null);}
 public static void content(Activity a,String title,String text,String label,Bitmap bitmap){
  a.runOnUiThread(()->{
   TvLink link=links.get(a);if(link==null)return;
   try{link.update(new JSONObject().put("title",title).put("text",text).put("label",label));
    link.jpeg=null;
    if(bitmap!=null&&!bitmap.isRecycled()){
     float scale=Math.min(1f,1600f/Math.max(bitmap.getWidth(),bitmap.getHeight()));
     Bitmap small=Bitmap.createScaledBitmap(bitmap,Math.max(1,(int)(bitmap.getWidth()*scale)),Math.max(1,(int)(bitmap.getHeight()*scale)),true);
     ByteArrayOutputStream out=new ByteArrayOutputStream();small.compress(Bitmap.CompressFormat.JPEG,75,out);
     if(out.size()<=250000)link.jpeg=out.toByteArray();
     if(small!=bitmap)small.recycle();
    }
    if(link.enabled)link.send();
   }catch(Exception ignored){}
  });
 }
 public static void slide(Activity a,String json){
  a.runOnUiThread(()->{TvLink link=links.get(a);if(link==null)return;try{link.update(new JSONObject(json));link.jpeg=null;if(link.enabled)link.send();}catch(Exception ignored){}});
 }
 private void update(JSONObject next){
  String body=next.optString("text")+next.optString("title");
  if(!body.equals(lastBody)){page=0;lastBody=body;}
  current=next;
 }
 private void menu(){
  String[] choices=enabled?new String[]{"Nästa TV-textsida","Föregående TV-textsida",blank?"Visa innehåll igen":"Svart TV-bild","Avsluta delning från denna app","Öppna mobilbryggan"}:new String[]{"Visa läsinnehåll på TV","Öppna mobilbryggan"};
  new AlertDialog.Builder(activity).setTitle("Sabbath TV").setItems(choices,(d,index)->{
   if(!enabled){if(index==0){enabled=true;blank=false;button.setText("TV ●");openBridge();}else openBridge();return;}
   if(index==0){page++;send();}else if(index==1){page=Math.max(0,page-1);send();}
   else if(index==2){blank=!blank;send();}
   else if(index==3){blank=true;send();enabled=false;button.setText("TV");}
   else openBridge();
  }).setNegativeButton("Stäng",null).show();
 }
 private void openBridge(){
  try{activity.startActivity(new Intent().setComponent(new ComponentName("se.churchshow.tvbridge","se.churchshow.tvbridge.MainActivity")).putExtra("start",true));}
  catch(ActivityNotFoundException e){new AlertDialog.Builder(activity).setTitle("Installera mobilbryggan en gång")
   .setMessage("Installera Sabbath TV – mobilbrygga från Church-Show-projektets GitHub-bygge. Samma brygga används av alla dina appar.")
   .setPositiveButton("Visa nedladdning",(d,w)->activity.startActivity(new Intent(Intent.ACTION_VIEW,android.net.Uri.parse("https://github.com/sabbatheverlasting-debug/Church-Show/actions/workflows/android.yml"))))
   .setNegativeButton("Stäng",null).show();}
 }
 private void readWeb(){
  String script="(function(){if(typeof window.sabbathTvContent==='function')return window.sabbathTvContent();return null;})()";
  try{web.evaluateJavascript(script,raw->{try{if(!"null".equals(raw)){JSONObject value=new JSONObject(raw);update(value);jpeg=null;}send();}catch(Exception ignored){}});}catch(Exception ignored){}
 }
 private static List<String> chunks(String s){
  List<String> out=new ArrayList<>();String rest=s;
  while(rest.length()>650){int cut=rest.lastIndexOf('\n',650);if(cut<200)cut=rest.lastIndexOf(' ',650);if(cut<200)cut=650;out.add(rest.substring(0,cut));rest=rest.substring(cut).trim();}
  out.add(rest);return out;
 }
 private void send(){
  if(!enabled||current==null)return;
  try{
   JSONObject data=new JSONObject(current.toString());
   List<String> pages=chunks(data.optString("text"));page=Math.min(page,pages.size()-1);
   data.put("text",pages.get(page));data.put("blank",blank||data.optBoolean("blank",false));
   if(pages.size()>1)data.put("label",data.optString("label")+" · TV "+(page+1)+"/"+pages.size());
   Intent intent=new Intent("se.churchshow.tvbridge.SLIDE").setComponent(new ComponentName("se.churchshow.tvbridge","se.churchshow.tvbridge.SlideReceiver"));
   intent.putExtra("slide",data.toString());if(jpeg!=null)intent.putExtra("jpeg",jpeg);
   activity.sendBroadcast(intent);lastSend=System.currentTimeMillis();
  }catch(Exception ignored){}
 }
 @Override public void onActivityResumed(Activity a){if(a==activity){resumed=true;}}
 @Override public void onActivityPaused(Activity a){if(a==activity)resumed=false;}
 @Override public void onActivityDestroyed(Activity a){if(a==activity){ui.removeCallbacksAndMessages(null);links.remove(a);a.getApplication().unregisterActivityLifecycleCallbacks(this);}}
 @Override public void onActivityCreated(Activity a,Bundle b){}
 @Override public void onActivityStarted(Activity a){}
 @Override public void onActivityStopped(Activity a){}
 @Override public void onActivitySaveInstanceState(Activity a,Bundle b){}
}
