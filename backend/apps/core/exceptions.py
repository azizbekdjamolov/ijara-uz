import logging

from rest_framework.views import exception_handler

logger = logging.getLogger("apps")


def api_exception_handler(exc, context):
    """Custom exception handler: consistent error envelope without leaking internals. Hech qachon qulatmaydi."""
    try:
        response = exception_handler(exc, context)
        if response is not None:
            if "detail" in response.data and len(response.data) == 1:
                response.data = {"message": response.data["detail"]}
            # Xatolikni log qilish - lekin 400/401 lar uchun emas, faqat 500
            if response.status_code >= 500:
                logger.exception("API 500: %s %s exc=%s", context.get("request").method if context.get("request") else "?", context.get("view").__class__.__name__ if context.get("view") else "?", exc)
            return response
        # DRF tanimagan exception -> 500 lekin JSON qaytaramiz, HTML emas
        logger.exception("Unhandled API exception: %s", exc)
        from rest_framework import status
        from rest_framework.response import Response

        return Response({"message": "Ichki xatolik, keyinroq urinib ko'ring"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.exception("api_exception_handler ichida xatolik: %s", e)
        from rest_framework import status
        from rest_framework.response import Response

        return Response({"message": "Xatolik yuz berdi"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
