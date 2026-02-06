import { application } from "controllers/application"

import FlashController from "controllers/flash_controller"
import DropdownController from "controllers/dropdown_controller"
import OtpController from "controllers/otp_controller"
import SpendingTypesController from "controllers/spending_types_controller"

application.register("flash", FlashController)
application.register("dropdown", DropdownController)
application.register("otp", OtpController)
application.register("spending-types", SpendingTypesController)
