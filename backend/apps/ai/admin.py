from django.contrib import admin

from apps.ai.models import AIAnalysis, RiskAssessment


@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):
    list_display = ("id", "listing", "analyzer_type", "provider", "model", "score", "confidence", "created_at")
    list_filter = ("analyzer_type", "provider")
    search_fields = ("listing__title",)
    readonly_fields = ("result", "reasons")


@admin.register(RiskAssessment)
class RiskAssessmentAdmin(admin.ModelAdmin):
    list_display = ("listing", "score", "level", "updated_at")
    list_filter = ("level",)
    search_fields = ("listing__title",)
    readonly_fields = ("reasons", "weights")
