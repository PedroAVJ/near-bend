import Base
import ./node_modules/near-function/stdlib/ai/bend/requests.bend as R

def invalid_request() -> R.OpenRouterRequest:
  R.OpenRouterRequest{"fixture-model", [], "invalid-token-count", None{}}
