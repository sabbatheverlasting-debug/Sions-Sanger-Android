#!/usr/bin/env python3
"""Execute the real shared session client against a deterministic Android broadcast harness."""
import pathlib, subprocess, tempfile, sys

client=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else next(pathlib.Path('.').glob('**/TvSession.java'))
receiver=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else None
files={
'android/os/Bundle.java': '''package android.os; import java.util.*; public class Bundle {
 private final Map<String,Object> values=new HashMap<>();
 public void putBoolean(String k,boolean v){values.put(k,v);} public boolean getBoolean(String k,boolean d){return (boolean)values.getOrDefault(k,d);}
 public void putString(String k,String v){values.put(k,v);} public String getString(String k,String d){return (String)values.getOrDefault(k,d);}
}''',
'android/os/Looper.java':'package android.os; public class Looper {public static Looper getMainLooper(){return new Looper();}}',
'android/os/Handler.java':'''package android.os; import java.util.*; public class Handler {
 public static List<Runnable> timers=new ArrayList<>(); public Handler(Looper l){}
 public void postDelayed(Runnable r,long ms){timers.add(r);} public void removeCallbacksAndMessages(Object o){timers.clear();}
}''',
'android/content/SharedPreferences.java':'''package android.content; import java.util.*; public class SharedPreferences {
 private final Map<String,String> values=new HashMap<>(); public String getString(String k,String d){return values.getOrDefault(k,d);}
 public Editor edit(){return new Editor();} public class Editor {public Editor putString(String k,String v){values.put(k,v);return this;} public Editor remove(String k){values.remove(k);return this;} public void apply(){}}
}''',
'android/content/Context.java':'''package android.content; public class Context {
 public static final int MODE_PRIVATE=0; private final SharedPreferences prefs=new SharedPreferences();
 public SharedPreferences getSharedPreferences(String n,int m){return prefs;}
}''',
'android/content/ComponentName.java':'''package android.content; public class ComponentName {
 public final String pkg,cls; public ComponentName(String p,String c){pkg=p;cls=c;}
}''',
'android/net/Uri.java':'package android.net; public class Uri {}',
'android/content/Intent.java':'''package android.content; public class Intent {
 public final String action; public ComponentName component; public Intent(String a){action=a;}
 public Intent setComponent(ComponentName c){component=c;return this;} public String getAction(){return action;}
 public String getStringExtra(String k){return null;} public byte[] getByteArrayExtra(String k){return null;} public android.net.Uri getData(){return null;}
}''',
'android/content/BroadcastReceiver.java':'''package android.content; import android.os.Bundle;
 public abstract class BroadcastReceiver {private int code; private Bundle data;
 public abstract void onReceive(Context c,Intent i); public int getResultCode(){return code;}
 public void setResultCode(int c){code=c;} public void setResultExtras(Bundle b){data=b;} public Bundle getResultExtras(boolean create){return data;}
}''',
'android/app/Activity.java':'''package android.app; import android.content.*; import android.os.*; import java.util.*;
 public class Activity extends Context {public static final int RESULT_OK=-1; public boolean destroyed;
 public final List<BroadcastReceiver> replies=new ArrayList<>(); public final List<Intent> requests=new ArrayList<>();
 public boolean isDestroyed(){return destroyed;}
 public void sendOrderedBroadcast(Intent i,String permission,BroadcastReceiver reply,Handler h,int code,String data,Bundle extras){requests.add(i);replies.add(reply);}
 public BroadcastReceiver take(){return replies.remove(0);}
 public void reply(boolean active,String session){reply(take(),true,active,session);}
 public void reply(BroadcastReceiver r,boolean supported,boolean active,String session){Bundle b=new Bundle();b.putBoolean("active",active);b.putString("session",session);r.setResultCode(supported?RESULT_OK:0);r.setResultExtras(b);r.onReceive(this,new Intent("status"));}
}''',
'SessionTest.java':'''import android.app.Activity; import android.content.*; import android.os.*; import java.util.*; import se.sabbath.tv.TvSession;
 public class SessionTest {
 static void check(boolean yes,String why){if(!yes)throw new AssertionError(why);}
 public static void main(String[] args){
  Activity a=new Activity(); List<Boolean> states=new ArrayList<>(); TvSession s=new TvSession(a,states::add);
  s.refresh();s.refresh();check(a.requests.size()==1,"one pending request");
  Intent i=a.requests.get(0);check(i.action.endsWith(".STATUS")&&i.component.pkg.equals("se.churchshow.tvbridge"),"explicit common bridge");
  a.reply(false,"");check(states.equals(List.of(false)),"inactive session does not start sharing");
  s.refresh();a.reply(true,"one");check(states.get(states.size()-1),"automatic join");
  s.pause();int n=a.requests.size();s.refresh();check(a.requests.size()==n,"no background polling");
  s.resume();BroadcastReceiver late=a.take();s.pause();s.resume();a.reply(late,true,true,"stale");
  check(states.size()==2,"paused query cannot regain control after resume");a.reply(true,"one");
  s.ignoreCurrent();s.refresh();a.reply(true,"one");check(!states.get(states.size()-1),"local stop survives polling");
  TvSession reopened=new TvSession(a,states::add);reopened.refresh();a.reply(true,"one");check(!states.get(states.size()-1),"local stop survives activity recreation");
  reopened.refresh();a.reply(true,"two");check(states.get(states.size()-1),"new user-started session can join");
  reopened.ignoreCurrent();reopened.allowCurrent();reopened.refresh();a.reply(true,"two");check(states.get(states.size()-1),"explicit Show overrides stop");
  reopened.refresh();a.reply(false,"");check(!states.get(states.size()-1),"global stop disables sharing");
  int before=states.size();reopened.refresh();a.reply(a.take(),false,false,"");check(states.size()==before,"old bridge preserves manual compatibility");
  reopened.refresh();BroadcastReceiver timedOut=a.take();List<Runnable> timers=new ArrayList<>(Handler.timers);for(Runnable t:timers)t.run();
  reopened.refresh();a.reply(timedOut,true,true,"stale");check(states.size()==before,"late previous request ignored");a.reply(true,"three");
  reopened.close();n=a.requests.size();reopened.refresh();check(a.requests.size()==n,"destroyed client stops polling");
  Activity b=new Activity();List<Boolean> bst=new ArrayList<>();TvSession earlyStop=new TvSession(b,bst::add);earlyStop.refresh();BroadcastReceiver pending=b.take();earlyStop.ignoreCurrent();b.reply(pending,true,true,"one");check(bst.isEmpty(),"stop wins over in-flight query");
  earlyStop.refresh();b.reply(true,"one");check(!bst.get(0),"stop before first reply stays stopped");
  earlyStop.refresh();b.reply(false,"");earlyStop.refresh();b.reply(true,"two");check(bst.get(bst.size()-1),"new session after early stop");
  // A new foreground app follows the same session without launching a bridge activity.
  Activity other=new Activity();List<Boolean> otherStates=new ArrayList<>();TvSession next=new TvSession(other,otherStates::add);next.refresh();other.reply(true,"three");check(otherStates.equals(List.of(true)),"cross-app follow");
  System.out.println("PASS: join, app switch, pause/resume, stale replies, timeout, local/global stop, recreation and legacy bridge");
 }
}''',
}
if receiver:
 files['se/churchshow/tvbridge/SlideReceiver.java']=receiver.read_text()
 files['se/churchshow/tvbridge/TvService.java']='''package se.churchshow.tvbridge; public class TvService {
 public static TvService active; public String sessionId="session-one"; public boolean ending,stopped;
 public boolean isEnding(){return ending;} public void requestStop(){stopped=true;ending=true;}
 public void audioCommand(String j,android.net.Uri u){} public void publish(String j,byte[] b){}
 }'''
 files['ReceiverTest.java']='''import android.content.*;import se.churchshow.tvbridge.*;public class ReceiverTest {
 static void check(boolean b){if(!b)throw new AssertionError();}
 static SlideReceiver query(){SlideReceiver r=new SlideReceiver();r.onReceive(new Context(),new Intent("se.churchshow.tvbridge.STATUS"));return r;}
 public static void main(String[] x){check(!query().getResultExtras(false).getBoolean("active",true));TvService.active=new TvService();check(query().getResultExtras(false).getBoolean("active",false));check(query().getResultExtras(false).getString("session","").equals("session-one"));
 new SlideReceiver().onReceive(new Context(),new Intent("se.churchshow.tvbridge.STOP"));check(TvService.active.stopped);check(!query().getResultExtras(false).getBoolean("active",true));System.out.println("PASS: bridge status inactive, active and stopping; no pairing credentials");}}
 '''
with tempfile.TemporaryDirectory(prefix='sabbath-tv-test-') as folder:
 root=pathlib.Path(folder)
 files['se/sabbath/tv/TvSession.java']=client.read_text()
 for path,text in files.items():
  p=root/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
 subprocess.run(['javac','-d',str(root/'classes'),*[str(root/p) for p in files]],check=True)
 subprocess.run(['java','-cp',str(root/'classes'),'SessionTest'],check=True)
 if receiver:subprocess.run(['java','-cp',str(root/'classes'),'ReceiverTest'],check=True)
