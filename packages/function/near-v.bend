# near-v: one application package, with selectively usable standard-library modules.
# This umbrella entry checks the complete pure typed closure; IO is host-side.
import Base
import ./f.bend as F
import ./stdlib/ai/ai-sdk.bend as AI
import ./stdlib/dot/bend/session.bend as Dot
import ./deployment/near-v.bend as Deployment
