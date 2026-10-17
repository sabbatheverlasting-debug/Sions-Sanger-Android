package se.sionssanger.app;
import android.content.*;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import java.io.*;
/** Grants the user-started TV bridge read access to a single imported audio file. */
public final class AudioProvider extends ContentProvider {
 @Override public boolean onCreate(){return true;}
 private File file(Uri uri)throws FileNotFoundException {try{String name=uri.getLastPathSegment();if(name==null||!name.matches("[0-9a-z-]+\\.(mp3|opus|ogg|m4a|wav|aac|flac)"))throw new IOException();File root=new File(getContext().getFilesDir(),"sions-audio").getCanonicalFile(),f=new File(root,name).getCanonicalFile();if(!root.equals(f.getParentFile())||!f.isFile())throw new IOException();return f;}catch(Exception e){throw new FileNotFoundException("Ljudfilen saknas");}}
 @Override public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException {if(!"r".equals(mode))throw new FileNotFoundException("Read only");return ParcelFileDescriptor.open(file(uri),ParcelFileDescriptor.MODE_READ_ONLY);}
 @Override public String getType(Uri u){String p=u.getLastPathSegment();return p!=null&&p.endsWith(".mp3")?"audio/mpeg":p!=null&&(p.endsWith(".opus")||p.endsWith(".ogg"))?"audio/ogg":"application/octet-stream";}
 @Override public Cursor query(Uri u,String[] p,String s,String[] a,String o){return null;}
 @Override public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException();}
 @Override public int delete(Uri u,String s,String[] a){return 0;}
 @Override public int update(Uri u,ContentValues v,String s,String[] a){return 0;}
}
