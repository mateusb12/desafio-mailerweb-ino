export interface paths {
  "/auth/login": {
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["LoginRequest"]
        }
      }
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["TokenResponse"]
          }
        }
        422: {
          content: {
            "application/json": components["schemas"]["HTTPValidationError"]
          }
        }
      }
    }
  }
  "/auth/register": {
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["RegisterRequest"]
        }
      }
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["TokenResponse"]
          }
        }
        422: {
          content: {
            "application/json": components["schemas"]["HTTPValidationError"]
          }
        }
      }
    }
  }
  "/auth/me": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": Record<string, never>
          }
        }
      }
    }
  }
  "/": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": Record<string, never>
          }
        }
      }
    }
  }
  "/health": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": Record<string, never>
          }
        }
      }
    }
  }
}

export interface components {
  schemas: {
    HTTPValidationError: {
      detail?: components["schemas"]["ValidationError"][]
    }
    LoginRequest: {
      email: string
      password: string
    }
    RegisterRequest: {
      email: string
      password: string
      confirm_password: string
    }
    TokenResponse: {
      access_token: string
      token_type?: string
    }
    ValidationError: {
      loc: Array<string | number>
      msg: string
      type: string
      input?: unknown
      ctx?: Record<string, unknown>
    }
  }
  securitySchemes: {
    HTTPBearer: {
      type: "http"
      scheme: "bearer"
    }
  }
}
