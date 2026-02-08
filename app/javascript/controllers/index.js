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
