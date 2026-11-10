class ContentSecurityPolicyMiddleware:
def __init__(self, get_response):
    self.get_response = get_response
    self.policy = {
        "default-src 'self';",
        "script-src 'self' 'unsafe-inline';",
        "style-src 'self' 'unsafe-inline';",
        "img-src 'self' data: https://res.cloudinary.com;",
        "media-src 'self' https://res.cloudinary.com;",
        "font-src 'self';",
        "connect-src 'self';",
        "object-src 'none';",
        "base-uri 'self';",
        "frame-ancestors 'self';"
    }

def __call__(self, request):
    response = self.get_response(request)
    response.setdefault('Content-Security-Policy', self.policy)
    return response
