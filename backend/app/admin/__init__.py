from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from markupsafe import Markup
from starlette.requests import Request
from starlette.responses import RedirectResponse

from ..core.config import settings
from ..core.security import verify_password, create_access_token, decode_token
from ..models.user import User, UserRole, DraftUser
from ..models.land import LandForSell, LandStatus, LandForBuy
from ..models.cms import CmsString
from ..models.ticket import AssistantTicket, TicketStatus
from ..models.knowledge import KnowledgeBase
from ..models.notification import NotificationLog


# ── Authentication ─────────────────────────────────────────────────────────────

class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = form.get("username", "")
        password = form.get("password", "")

        if email == settings.ADMIN_EMAIL and verify_password(password, settings.ADMIN_PASSWORD):
            token = create_access_token(user_id="admin", role=UserRole.ADMIN)
            request.session.update({"admin_token": token})
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get("admin_token")
        if not token:
            return False
        try:
            payload = decode_token(token)
            return payload.get("role") == UserRole.ADMIN
        except Exception:
            return False


# ── Land for Sale ──────────────────────────────────────────────────────────────

class LandForSellAdmin(ModelView, model=LandForSell):
    name = "Land for Sale"
    name_plural = "Lands for Sale"
    icon = "fa-solid fa-map-pin"

    # List view
    column_list = [
        "status", "region", "city", "broj",
        "area_m2", "price_eur",
        "seller", "created_at",
    ]
    column_labels = {
        "area_m2": "Area (m²)",
        "price_eur": "Price (€)",
        "seller": "Seller",
        "created_at": "Created",
        "updated_at": "Updated",
        "admin_notes": "Admin notes",
        "contacts": 'Contacts (JSON: {"phone": "+382...", "telegram": "@..."})',
        "photos": 'Photos (JSON: ["url1", "url2"])',
    }

    # Filters sidebar
    column_filters = ["status", "region", "city"]

    # Text search
    column_searchable_list = ["broj", "region", "city", "address", "admin_notes"]

    # Sortable columns
    column_sortable_list = ["created_at", "updated_at", "price_eur", "area_m2", "status", "region"]

    # Detail page — all fields
    column_details_list = [
        "id", "status", "seller",
        "broj", "region", "city", "address", "lat", "lon",
        "area_m2", "price_eur", "description",
        "contacts", "photos",
        "admin_notes", "created_at", "updated_at",
    ]

    # Create / Edit form
    form_columns = [
        "status", "seller",
        "broj", "region", "city", "address",
        "lat", "lon",
        "area_m2", "price_eur",
        "description",
        "contacts",
        "photos",
        "admin_notes",
    ]

    can_create = True
    can_edit = True
    can_delete = True
    page_size = 50
    page_size_options = [25, 50, 100]


# ── Purchase Requests ──────────────────────────────────────────────────────────

class LandForBuyAdmin(ModelView, model=LandForBuy):
    name = "Purchase Request"
    name_plural = "Purchase Requests"
    icon = "fa-solid fa-magnifying-glass"

    column_list = [
        "buyer", "region",
        "price_min_eur", "price_max_eur",
        "area_min_m2", "area_max_m2",
        "is_active", "created_at",
    ]
    column_labels = {
        "price_min_eur": "Price min (€)",
        "price_max_eur": "Price max (€)",
        "area_min_m2": "Area min (m²)",
        "area_max_m2": "Area max (m²)",
        "is_active": "Active",
        "buyer": "Buyer",
    }

    column_filters = ["region", "is_active"]
    column_searchable_list = ["region"]
    column_sortable_list = ["created_at", "is_active", "region", "price_min_eur", "price_max_eur"]

    column_details_list = [
        "id", "buyer",
        "region", "cities",
        "price_min_eur", "price_max_eur",
        "area_min_m2", "area_max_m2",
        "channels", "is_active",
        "created_at", "updated_at",
    ]

    form_columns = [
        "buyer", "region", "cities",
        "price_min_eur", "price_max_eur",
        "area_min_m2", "area_max_m2",
        "channels", "is_active",
    ]

    can_create = True
    page_size = 50


# ── Users ──────────────────────────────────────────────────────────────────────

class UserAdmin(ModelView, model=User):
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-users"

    column_list = [
        "full_name", "phone", "email",
        "role", "is_active", "is_verified",
        "is_dual_role", "created_at",
    ]
    column_labels = {
        "full_name": "Name",
        "is_active": "Active",
        "is_verified": "Verified",
        "is_dual_role": "Dual role",
        "lands_for_sell": "Listings (sale)",
        "lands_for_buy": "Searches",
        "created_at": "Registered",
        "last_active_at": "Last active",
    }

    column_filters = ["role", "is_active", "is_verified", "is_dual_role"]
    column_searchable_list = ["email", "full_name", "phone", "telegram", "whatsapp", "viber"]
    column_sortable_list = ["created_at", "last_active_at", "role", "is_active", "full_name"]

    # Detail page — shows user fields + all their listings and searches
    column_details_list = [
        "id", "full_name", "email",
        "phone", "whatsapp", "viber", "telegram",
        "role", "is_active", "is_verified", "is_dual_role",
        "preferred_lang",
        "created_at", "last_active_at",
        "lands_for_sell",
        "lands_for_buy",
    ]

    form_columns = [
        "full_name", "email", "phone",
        "whatsapp", "viber", "telegram",
        "role", "is_active", "is_verified", "is_dual_role",
        "preferred_lang",
    ]
    can_create = True
    can_delete = True
    page_size = 50
    page_size_options = [25, 50, 100]


# ── Draft Users ────────────────────────────────────────────────────────────────

class DraftUserAdmin(ModelView, model=DraftUser):
    name = "Draft User"
    name_plural = "Draft Users"
    icon = "fa-solid fa-user-clock"

    column_list = [
        "contact_type", "contact_value",
        "source", "reminder_sent_at", "created_at",
    ]
    column_filters = ["contact_type", "source"]
    column_searchable_list = ["contact_value"]
    column_sortable_list = ["created_at", "reminder_sent_at"]

    can_create = False
    page_size = 50


# ── CMS Texts ──────────────────────────────────────────────────────────────────

class CmsStringAdmin(ModelView, model=CmsString):
    name = "CMS Text"
    name_plural = "CMS Texts"
    icon = "fa-solid fa-pen-to-square"

    column_list = ["key", "lang", "value", "description", "updated_at"]
    column_labels = {
        "key": "Key",
        "lang": "Language",
        "value": "Text",
        "description": "Hint (admin)",
        "updated_at": "Updated",
    }

    column_filters = ["lang"]
    column_searchable_list = ["key", "value", "description"]
    column_sortable_list = ["key", "lang", "updated_at"]

    form_columns = ["key", "lang", "value", "description"]

    page_size = 100
    page_size_options = [50, 100, 200]


# ── AI Tickets ─────────────────────────────────────────────────────────────────

class AssistantTicketAdmin(ModelView, model=AssistantTicket):
    name = "AI Ticket"
    name_plural = "AI Tickets"
    icon = "fa-solid fa-robot"

    column_list = ["status", "question_text", "created_at"]
    column_filters = ["status"]
    column_sortable_list = ["created_at", "status"]
    column_searchable_list = ["question_text"]

    form_columns = ["status", "admin_response"]
    page_size = 50


# ── Knowledge Base ─────────────────────────────────────────────────────────────

class KnowledgeBaseAdmin(ModelView, model=KnowledgeBase):
    name = "Knowledge Base"
    name_plural = "Knowledge Base"
    icon = "fa-solid fa-book"

    column_list = ["category", "lang", "title", "updated_at"]
    column_filters = ["category", "lang"]
    column_searchable_list = ["title", "content"]
    column_sortable_list = ["category", "lang", "updated_at"]

    form_columns = ["category", "lang", "title", "content"]
    page_size = 50


# ── Notifications Log ──────────────────────────────────────────────────────────

class NotificationLogAdmin(ModelView, model=NotificationLog):
    name = "Notification"
    name_plural = "Notifications Log"
    icon = "fa-solid fa-bell"

    column_list = ["type", "channel", "status", "sent_at"]
    column_filters = ["type", "channel", "status"]
    column_sortable_list = ["sent_at", "status"]

    can_create = False
    can_edit = False
    page_size = 50


# ── Factory ────────────────────────────────────────────────────────────────────

def create_admin(app, engine) -> Admin:
    authentication_backend = AdminAuth(secret_key=settings.SECRET_KEY)
    admin = Admin(
        app,
        engine,
        authentication_backend=authentication_backend,
        title="MonteLand Admin",
        base_url="/admin",
    )
    admin.add_view(LandForSellAdmin)
    admin.add_view(LandForBuyAdmin)
    admin.add_view(UserAdmin)
    admin.add_view(DraftUserAdmin)
    admin.add_view(CmsStringAdmin)
    admin.add_view(AssistantTicketAdmin)
    admin.add_view(KnowledgeBaseAdmin)
    admin.add_view(NotificationLogAdmin)
    return admin
