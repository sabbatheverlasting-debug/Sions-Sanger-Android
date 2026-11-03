package se.sabbath.tv;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

/** Follows an explicitly started Sabbath TV session. Never starts a service or exposes pairing keys. */
public final class TvSession {
 public interface Listener { void changed(boolean following); }
 private final Activity activity;
 private final Listener listener;
 private final Handler handler=new Handler(Looper.getMainLooper());
 private final SharedPreferences preferences;
 private boolean foreground=true,pending,closed,ignoreUnknown;
 private long generation;
 private String session="";
 public TvSession(Activity activity,Listener listener){
  this.activity=activity;this.listener=listener;
  preferences=activity.getSharedPreferences("sabbath-tv-follow",Context.MODE_PRIVATE);
 }
 public void refresh(){
  if(closed||!foreground||pending||activity.isDestroyed())return;
  pending=true;final long request=++generation;
  handler.postDelayed(()->{if(request==generation)pending=false;},2500);
  Intent intent=new Intent("se.churchshow.tvbridge.STATUS")
    .setComponent(new ComponentName("se.churchshow.tvbridge","se.churchshow.tvbridge.SlideReceiver"));
  try{activity.sendOrderedBroadcast(intent,null,new BroadcastReceiver(){
   @Override public void onReceive(Context context,Intent response){
    if(request!=generation||closed||!foreground||activity.isDestroyed())return;
    pending=false;
    // Old bridges do not implement STATUS; their manual controls remain usable.
    if(getResultCode()!=Activity.RESULT_OK)return;
    Bundle data=getResultExtras(false);if(data==null)return;
    boolean active=data.getBoolean("active",false);
    String next=data.getString("session","");
    if(!active||next.isEmpty()){
     session="";ignoreUnknown=false;listener.changed(false);return;
    }
    session=next;
    if(ignoreUnknown){preferences.edit().putString("ignoredSession",session).apply();ignoreUnknown=false;}
    listener.changed(!session.equals(preferences.getString("ignoredSession","")));
   }
  },handler,0,null,null);}catch(Exception ignored){pending=false;}
 }
 /** Local stop stays stopped, including after rotating or reopening this app. */
 public void ignoreCurrent(){
  generation++;pending=false;
  if(session.isEmpty())ignoreUnknown=true;
  else preferences.edit().putString("ignoredSession",session).apply();
 }
 /** An explicit Show/Connect button overrides a previous local stop. */
 public void allowCurrent(){
  generation++;pending=false;ignoreUnknown=false;
  preferences.edit().remove("ignoredSession").apply();
 }
 public void resume(){foreground=true;refresh();}
 public void pause(){foreground=false;pending=false;generation++;}
 public void close(){closed=true;pause();handler.removeCallbacksAndMessages(null);}
}
