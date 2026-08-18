from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Custom exception handler: consistent error envelope without leaking internals."""
    response = exception_handler(exc, context)
    if response is not None and "detail" in response.data and len(response.data) == 1:
        response.data = {"message": response.data["detail"]}
    return response
