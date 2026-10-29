package se.sionssanger.app;

import java.io.*;
import java.nio.file.Files;
import java.util.Arrays;

/**
 * Safe Standard MIDI File (format 0 or 1) instrument override.
 * Changes a temporary playback COPY, never the imported source file.
 * GM programs: Acoustic Grand Piano=0, Church Organ=19.
 */
public final class SionsMidi {
 private SionsMidi() {}
 private static int readInt(byte[] b,int p)throws IOException {
  if(p<0||p+4>b.length)throw new IOException("Invalid MIDI chunk");
  return ((b[p]&255)<<24)|((b[p+1]&255)<<16)|((b[p+2]&255)<<8)|(b[p+3]&255);
 }
 private static void writeInt(ByteArrayOutputStream out,int n){
  out.write((n>>>24)&255);out.write((n>>>16)&255);out.write((n>>>8)&255);out.write(n&255);
 }
 private static int vlqEnd(byte[] b,int p)throws IOException{
  for(int i=0;i<4;i++){
   if(p>=b.length)throw new IOException("Truncated MIDI event");
   if((b[p++]&128)==0)return p;
  }
  throw new IOException("Invalid MIDI variable length");
 }
 private static int scanTrack(byte[] b,int program)throws IOException{
  int pos=0,running=0;
  while(pos<b.length){
   pos=vlqEnd(b,pos);
   if(pos>=b.length)throw new IOException("Truncated MIDI event");
   int first=b[pos]&255,status;
   if((first&128)!=0){
    status=first;pos++;
    if(status<0xF0)running=status;
    else running=0;
   }else{
    status=running;
    if(status==0)throw new IOException("Invalid running MIDI status");
   }
   if(status==0xFF){
    if(pos>=b.length)throw new IOException("Invalid MIDI meta");
    pos++;int end=vlqEnd(b,pos);int count=0;
    for(int i=pos;i<end;i++)count=(count<<7)|(b[i]&127);
    pos=end;
    if(count<0||pos+count>b.length)throw new IOException("Truncated MIDI meta");
    pos+=count;
   } else if(status==0xF0||status==0xF7){
    int end=vlqEnd(b,pos);int count=0;
    for(int i=pos;i<end;i++)count=(count<<7)|(b[i]&127);
    pos=end;
    if(count<0||pos+count>b.length)throw new IOException("Truncated MIDI sysex");
    pos+=count;
   } else if(status>=0x80&&status<=0xEF){
    int code=status&0xF0,channel=status&0x0F;
    int size=(code==0xC0||code==0xD0)?1:2;
    if(pos+size>b.length)throw new IOException("Truncated MIDI channel event");
    if(code==0xC0&&channel!=9)b[pos]=(byte)program;
    pos+=size;
   }else{
    throw new IOException("Unsupported MIDI system event");
   }
  }
  return pos;
 }
 public static byte[] transform(byte[] input,int program)throws IOException {
  if(program!=0&&program!=19)throw new IOException("Unsupported instrument");
  if(input==null||input.length<22||input.length>4*1024*1024)
   throw new IOException("Invalid MIDI size");
  if(readInt(input,0)!=0x4D546864)throw new IOException("Not a MIDI file");
  int headerLen=readInt(input,4);
  if(headerLen<6||headerLen>1024||8+headerLen>input.length)
   throw new IOException("Invalid MIDI header");
  int format=((input[8]&255)<<8)|(input[9]&255);
  if(format>1)throw new IOException("Only MIDI types 0 and 1 are supported");
  int position=8+headerLen,tracks=0,expected=((input[10]&255)<<8)|(input[11]&255);
  ByteArrayOutputStream out=new ByteArrayOutputStream(input.length+100);
  out.write(input,0,position);
  while(position<input.length){
   if(position+8>input.length)throw new IOException("Truncated MIDI chunk");
   int type=readInt(input,position),length=readInt(input,position+4);
   position+=8;
   if(length<0||length>input.length-position)throw new IOException("Invalid MIDI track size");
   byte[] chunk=Arrays.copyOfRange(input,position,position+length);
   position+=length;
   if(type==0x4D54726B){
    scanTrack(chunk,program);
    // Add program-change events at tick zero to every melodic channel,
    // including files that have no Program Change events at all.
    // Channel 10 (index 9) is percussion and remains untouched.
    ByteArrayOutputStream track=new ByteArrayOutputStream(chunk.length+48);
    if(tracks==0){
     for(int ch=0;ch<16;ch++){
      if(ch==9)continue;
      track.write(0);track.write(0xC0|ch);track.write(program);
     }
    }
    track.write(chunk,0,chunk.length);
    byte[] rendered=track.toByteArray();
    writeInt(out,type);writeInt(out,rendered.length);
    out.write(rendered,0,rendered.length);
    tracks++;
   }else{
    writeInt(out,type);writeInt(out,length);out.write(chunk,0,chunk.length);
   }
  }
  if(tracks==0||tracks!=expected)throw new IOException("MIDI track count mismatch");
  return out.toByteArray();
 }
 public static File playbackCopy(File imported,File cache,boolean organ)throws IOException{
  if(!cache.exists()&&!cache.mkdirs())throw new IOException("Cannot create MIDI cache");
  byte[] bytes=Files.readAllBytes(imported.toPath());
  byte[] converted=transform(bytes,organ?19:0);
  File out=File.createTempFile("sions-midi-", ".mid", cache);
  try(FileOutputStream stream=new FileOutputStream(out)){stream.write(converted);}
  return out;
 }
}
