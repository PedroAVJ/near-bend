# Native voice fixtures now inject runtime strings in ../native-voice.test.mjs.
# This generic typed consumer intentionally contains no closed JSON main terms.
import Base
import ../../bend/session.bend as Dot
import ../../bend/native.bend as Native

def realtime(wire: String, id: String, session: Dot.Session, history: Dot.Continuity) -> Result<&2, &2, String, Dot.Continuity>:
  Native.realtime_wire(wire, id, session, history)

def live(wire: String, id: String, session: Dot.Session, history: Dot.Continuity) -> Result<&2, &2, String, Dot.Continuity>:
  Native.live_wire(wire, id, session, history)
