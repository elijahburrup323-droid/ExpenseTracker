import { application } from "controllers/application"

import FlashController from "controllers/flash_controller"
import DropdownController from "controllers/dropdown_controller"
import OtpController from "controllers/otp_controller"
import SpendingTypesController from "controllers/spending_types_controller"
import SpendingCategoriesController from "controllers/spending_categories_controller"
import AccountTypesController from "controllers/account_types_controller"
import AccountsController from "controllers/accounts_controller"
import PaymentsController from "controllers/payments_controller"
import ThemeController from "controllers/theme_controller"
import IncomeFrequencyMastersController from "controllers/income_frequency_masters_controller"
import IncomeUserFrequenciesController from "controllers/income_user_frequencies_controller"
import IncomeRecurringsController from "controllers/income_recurrings_controller"
import IncomeEntriesController from "controllers/income_entries_controller"
import SidebarController from "controllers/sidebar_controller"
import AdminUsersController from "controllers/admin_users_controller"
import QuotesController from "controllers/quotes_controller"
import DbuController from "controllers/dbu_controller"
import SettingsEmailsController from "controllers/settings_emails_controller"
import SettingsPhonesController from "controllers/settings_phones_controller"
import BugReportsController from "controllers/bug_reports_controller"
import NetWorthPopulateController from "controllers/net_worth_populate_controller"
import DashboardController from "controllers/dashboard_controller"
import LegalTocController from "controllers/legal_toc_controller"
import TransferMastersController from "controllers/transfer_masters_controller"
import UploadController from "controllers/upload_controller"
import PricingController from "controllers/pricing_controller"
import MonthActionsController from "controllers/month_actions_controller"
import SoftCloseController from "controllers/soft_close_controller"

application.register("flash", FlashController)
application.register("dropdown", DropdownController)
application.register("otp", OtpController)
application.register("spending-types", SpendingTypesController)
application.register("spending-categories", SpendingCategoriesController)
application.register("account-types", AccountTypesController)
application.register("accounts", AccountsController)
application.register("payments", PaymentsController)
application.register("theme", ThemeController)
application.register("income-frequency-masters", IncomeFrequencyMastersController)
application.register("income-user-frequencies", IncomeUserFrequenciesController)
application.register("income-recurrings", IncomeRecurringsController)
application.register("income-entries", IncomeEntriesController)
application.register("sidebar", SidebarController)
application.register("admin-users", AdminUsersController)
application.register("quotes", QuotesController)
application.register("dbu", DbuController)
application.register("settings-emails", SettingsEmailsController)
application.register("settings-phones", SettingsPhonesController)
application.register("bug-reports", BugReportsController)
application.register("net-worth-populate", NetWorthPopulateController)
application.register("dashboard", DashboardController)
application.register("legal-toc", LegalTocController)
application.register("transfer-masters", TransferMastersController)
application.register("upload", UploadController)
application.register("pricing", PricingController)
application.register("month-actions", MonthActionsController)
application.register("soft-close", SoftCloseController)
