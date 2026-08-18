from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SiteSetting(models.Model):
    """Admin-configurable key/value settings.

    Values are JSON-encoded. Defaults live in the settings service so the
    platform works out of the box; admins may override any key via the admin.
    """

    key = models.SlugField(max_length=128, unique=True)
    value = models.JSONField(default=dict, blank=True)
    description = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sayt sozlamasi"
        verbose_name_plural = "Sayt sozlamalari"

    def __str__(self) -> str:
        return self.key


class AuditLog(TimeStampedModel):
    """Non-sensitive audit trail. Never store passwords, tokens or documents."""

    actor = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=64)
    target_type = models.CharField(max_length=64, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = "Audit yozuvi"
        verbose_name_plural = "Audit yozuvlari"
        indexes = [
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["action", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} {self.target_type}:{self.target_id}"

    @classmethod
    def record(cls, *, action, actor=None, target_type="", target_id="", details=None, ip_address=None):
        return cls.objects.create(
            action=action,
            actor=actor,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else "",
            details=details or {},
            ip_address=ip_address,
        )
