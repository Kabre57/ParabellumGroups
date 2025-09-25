-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER', 'EMPLOYEE', 'ACCOUNTANT', 'PURCHASING_MANAGER');

-- CreateEnum
CREATE TYPE "public"."CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "public"."AddressType" AS ENUM ('BILLING', 'SHIPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('PRODUCT', 'SERVICE', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('TRANSFER', 'CHECK', 'CARD', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."QuoteStatus" AS ENUM ('DRAFT', 'SUBMITTED_FOR_SERVICE_APPROVAL', 'APPROVED_BY_SERVICE_MANAGER', 'REJECTED_BY_SERVICE_MANAGER', 'SUBMITTED_FOR_DG_APPROVAL', 'APPROVED_BY_DG', 'REJECTED_BY_DG', 'ACCEPTED_BY_CLIENT', 'REJECTED_BY_CLIENT', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."QuoteType" AS ENUM ('DQE', 'REAL');

-- CreateEnum
CREATE TYPE "public"."ApprovalLevel" AS ENUM ('SERVICE_MANAGER', 'GENERAL_DIRECTOR');

-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."InvoiceType" AS ENUM ('INVOICE', 'CREDIT_NOTE', 'PROFORMA');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RecurringFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."ReminderType" AS ENUM ('FRIENDLY', 'FORMAL', 'FINAL', 'LEGAL');

-- CreateEnum
CREATE TYPE "public"."ReminderStatus" AS ENUM ('SENT', 'READ', 'PAID', 'IGNORED');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('QUOTE', 'INVOICE', 'CREDIT_NOTE', 'REMinder', 'REPORT');

-- CreateEnum
CREATE TYPE "public"."ExpenseStatus" AS ENUM ('PENDING', 'PAID', 'REIMBURSED');

-- CreateEnum
CREATE TYPE "public"."SourceDocumentType" AS ENUM ('INVOICE', 'QUOTE', 'PAYMENT', 'EXPENSE', 'SALARY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CashFlowType" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "public"."ContractType" AS ENUM ('CDI', 'CDD', 'STAGE', 'FREELANCE');

-- CreateEnum
CREATE TYPE "public"."LeaveType" AS ENUM ('ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."SalaryStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "public"."LoanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "public"."PurchaseOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReviewType" AS ENUM ('ANNUAL', 'PROBATION', 'PROMOTION', 'PROJECT');

-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'COMPLETED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "public"."TechnicienStatus" AS ENUM ('AVAILABLE', 'ON_MISSION', 'ON_LEAVE', 'SICK', 'TRAINING');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('MEETING', 'TASK', 'APPOINTMENT', 'REMINDER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TimeOffType" AS ENUM ('VACATION', 'SICK_LEAVE', 'PERSONAL_DAY', 'MATERNITY_LEAVE', 'PATERNITY_LEAVE', 'BEREAVEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."services" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "service_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "preferences" TEXT,
    "permissions" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" SERIAL NOT NULL,
    "customer_number" TEXT NOT NULL,
    "type" "public"."CustomerType" NOT NULL DEFAULT 'COMPANY',
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "siret" TEXT,
    "vat_number" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "website" TEXT,
    "payment_terms" INTEGER NOT NULL DEFAULT 30,
    "payment_method" "public"."PaymentMethod" NOT NULL DEFAULT 'TRANSFER',
    "credit_limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT,
    "tags" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "service_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_addresses" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "type" "public"."AddressType" NOT NULL,
    "name" TEXT,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "postal_code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'France',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."ProductType" NOT NULL DEFAULT 'PRODUCT',
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pièce',
    "price_ht" DOUBLE PRECISION NOT NULL,
    "vat_rate" DOUBLE PRECISION NOT NULL DEFAULT 20.00,
    "cost_price" DOUBLE PRECISION,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "stock_alert_threshold" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "weight" DOUBLE PRECISION,
    "dimensions" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_prices" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "customer_category" TEXT,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "price_ht" DOUBLE PRECISION NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quotes" (
    "id" SERIAL NOT NULL,
    "quote_number" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "customer_address_id" INTEGER,
    "status" "public"."QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "quote_date" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "subtotal_ht" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_ttc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "terms" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "submitted_for_service_approval_at" TIMESTAMP(3),
    "service_manager_approved_by" INTEGER,
    "service_manager_approval_date" TIMESTAMP(3),
    "service_manager_comments" TEXT,
    "dg_approved_by" INTEGER,
    "dg_approval_date" TIMESTAMP(3),
    "dg_comments" TEXT,
    "accepted_at" TIMESTAMP(3),
    "quote_type" "public"."QuoteType" NOT NULL DEFAULT 'REAL',
    "dqe_reference" TEXT,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_items" (
    "id" SERIAL NOT NULL,
    "quote_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price_ht" DOUBLE PRECISION NOT NULL,
    "discount_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vat_rate" DOUBLE PRECISION NOT NULL,
    "total_ht" DOUBLE PRECISION NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_approvals" (
    "id" SERIAL NOT NULL,
    "quote_id" INTEGER NOT NULL,
    "approver_id" INTEGER NOT NULL,
    "approval_level" "public"."ApprovalLevel" NOT NULL,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approval_date" TIMESTAMP(3),
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" SERIAL NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "customer_address_id" INTEGER,
    "quote_id" INTEGER,
    "type" "public"."InvoiceType" NOT NULL DEFAULT 'INVOICE',
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "subtotal_ht" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_ttc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance_due" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payment_terms" INTEGER NOT NULL DEFAULT 30,
    "late_fee_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "terms" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_items" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price_ht" DOUBLE PRECISION NOT NULL,
    "discount_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vat_rate" DOUBLE PRECISION NOT NULL,
    "total_ht" DOUBLE PRECISION NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" SERIAL NOT NULL,
    "payment_number" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "payment_method" "public"."PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_allocations" (
    "id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recurring_invoices" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "template_name" TEXT NOT NULL,
    "frequency" "public"."RecurringFrequency" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "next_invoice_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "subtotal_ht" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_ttc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "terms" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recurring_invoice_items" (
    "id" SERIAL NOT NULL,
    "recurring_invoice_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price_ht" DOUBLE PRECISION NOT NULL,
    "vat_rate" DOUBLE PRECISION NOT NULL,
    "total_ht" DOUBLE PRECISION NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recurring_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reminders" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "type" "public"."ReminderType" NOT NULL,
    "sent_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "amount_due" DOUBLE PRECISION NOT NULL,
    "late_fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "public"."ReminderStatus" NOT NULL DEFAULT 'SENT',
    "email_subject" TEXT,
    "email_body" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "details" TEXT,
    "entity_id" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expenses" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" "public"."ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "receipt_url" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounting_entries" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "entry_type" "public"."CashFlowType" NOT NULL,
    "account_id" INTEGER NOT NULL,
    "source_document_type" "public"."SourceDocumentType" NOT NULL,
    "source_document_id" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_type" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cash_flows" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "public"."CashFlowType" NOT NULL,
    "account_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employees" (
    "id" SERIAL NOT NULL,
    "employee_number" TEXT NOT NULL,
    "registration_number" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "place_of_birth" TEXT,
    "nationality" TEXT,
    "social_security_number" TEXT,
    "cnps_number" TEXT,
    "cnam_number" TEXT,
    "bank_account" TEXT,
    "emergency_contact" TEXT,
    "service_id" INTEGER,
    "position" TEXT NOT NULL,
    "department" TEXT,
    "professional_category" TEXT,
    "professional_level" TEXT,
    "manager" TEXT,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contracts" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "contract_type" "public"."ContractType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "base_salary" DOUBLE PRECISION NOT NULL,
    "working_hours" DOUBLE PRECISION NOT NULL,
    "benefits" TEXT,
    "terms" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."salaries" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "working_days" INTEGER NOT NULL DEFAULT 22,
    "base_salary" DOUBLE PRECISION NOT NULL,
    "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonuses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid_leave" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gross_salary" DOUBLE PRECISION NOT NULL,
    "social_contributions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cnps_employee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cnam_employee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fdfp_employee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "non_taxable_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other_deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loan_deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_deductions" DOUBLE PRECISION NOT NULL,
    "net_salary" DOUBLE PRECISION NOT NULL,
    "status" "public"."SalaryStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" "public"."PaymentMethod",
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leave_requests" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "leave_type" "public"."LeaveType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" "public"."LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prospects" (
    "id" SERIAL NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "position" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "company_size" TEXT,
    "estimated_value" DOUBLE PRECISION,
    "priority" TEXT NOT NULL DEFAULT 'B',
    "stage" TEXT NOT NULL DEFAULT 'preparation',
    "source" TEXT,
    "source_detail" TEXT,
    "source_author" TEXT,
    "notes" TEXT,
    "has_budget" BOOLEAN NOT NULL DEFAULT false,
    "is_decision_maker" BOOLEAN NOT NULL DEFAULT false,
    "has_need" BOOLEAN NOT NULL DEFAULT false,
    "timeline" TEXT,
    "last_contact" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_action" TEXT,
    "next_action_date" TIMESTAMP(3),
    "assigned_to" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prospect_activities" (
    "id" SERIAL NOT NULL,
    "prospect_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "description" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "outcome" TEXT,
    "next_action" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospect_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" SERIAL NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."loans" (
    "id" SERIAL NOT NULL,
    "loan_number" TEXT NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "interest_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthly_payment" DOUBLE PRECISION NOT NULL,
    "remaining_amount" DOUBLE PRECISION NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "status" "public"."LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."loan_payments" (
    "id" SERIAL NOT NULL,
    "loan_id" INTEGER NOT NULL,
    "salary_id" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "principal" DOUBLE PRECISION NOT NULL,
    "interest" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."specialites" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."techniciens" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "specialite_id" INTEGER NOT NULL,
    "utilisateur_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "public"."TechnicienStatus" NOT NULL DEFAULT 'AVAILABLE',
    "current_mission_id" TEXT,

    CONSTRAINT "techniciens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."missions" (
    "num_intervention" TEXT NOT NULL,
    "nature_intervention" TEXT NOT NULL,
    "objectif_du_contrat" TEXT NOT NULL,
    "description" TEXT,
    "priorite" TEXT DEFAULT 'normale',
    "statut" TEXT DEFAULT 'planifiee',
    "date_sortie_fiche_intervention" TIMESTAMP(3) NOT NULL,
    "client_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("num_intervention")
);

-- CreateTable
CREATE TABLE "public"."interventions" (
    "id" SERIAL NOT NULL,
    "date_heure_debut" TIMESTAMP(3) NOT NULL,
    "date_heure_fin" TIMESTAMP(3),
    "duree" INTEGER,
    "mission_id" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'planifiee',
    "commentaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."technicien_interventions" (
    "id" SERIAL NOT NULL,
    "technicien_id" INTEGER NOT NULL,
    "intervention_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'assistant',
    "commentaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technicien_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rapports_mission" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "intervention_id" INTEGER,
    "technicien_id" INTEGER NOT NULL,
    "mission_id" TEXT NOT NULL,
    "created_by_id" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'soumis',
    "date_validation" TIMESTAMP(3),
    "commentaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rapports_mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rapport_images" (
    "id" SERIAL NOT NULL,
    "rapport_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "ordre" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rapport_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."materiels" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "description" TEXT,
    "statut" TEXT,
    "quantite_totale" INTEGER NOT NULL DEFAULT 0,
    "quantite_disponible" INTEGER NOT NULL DEFAULT 0,
    "seuil_alerte" INTEGER NOT NULL DEFAULT 5,
    "emplacement" TEXT,
    "categorie" TEXT NOT NULL DEFAULT 'Outillage',
    "prix_unitaire" DOUBLE PRECISION DEFAULT 0,
    "fournisseur" TEXT,
    "date_achat" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sorties_materiel" (
    "id" SERIAL NOT NULL,
    "materiel_id" INTEGER NOT NULL,
    "intervention_id" INTEGER NOT NULL,
    "technicien_id" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "date_sortie" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sorties_materiel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."client_projects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "customer_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "budget" DOUBLE PRECISION,
    "status" "public"."ProjectStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_tasks" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to" INTEGER,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_entries" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_documents" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_orders" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "requested_by_id" INTEGER NOT NULL,
    "approved_by_id" INTEGER,
    "service_id" INTEGER,
    "status" "public"."PurchaseOrderStatus" NOT NULL DEFAULT 'PENDING',
    "order_date" TIMESTAMP(3) NOT NULL,
    "expected_date" TIMESTAMP(3),
    "delivery_date" TIMESTAMP(3),
    "subtotal_ht" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_ttc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_order_items" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price_ht" DOUBLE PRECISION NOT NULL,
    "vat_rate" DOUBLE PRECISION NOT NULL,
    "total_ht" DOUBLE PRECISION NOT NULL,
    "received_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_receipts" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "receipt_date" TIMESTAMP(3) NOT NULL,
    "received_by" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_receipt_items" (
    "id" SERIAL NOT NULL,
    "purchase_receipt_id" INTEGER NOT NULL,
    "purchase_order_item_id" INTEGER NOT NULL,
    "quantity_received" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "purchase_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."performance_reviews" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "reviewer_id" INTEGER NOT NULL,
    "review_date" TIMESTAMP(3) NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "review_type" "public"."ReviewType" NOT NULL,
    "status" "public"."ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "overall_score" DOUBLE PRECISION,
    "strengths" TEXT,
    "areas_to_improve" TEXT,
    "goals" TEXT,
    "comments" TEXT,
    "employee_comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."performance_review_criteria" (
    "id" SERIAL NOT NULL,
    "performance_review_id" INTEGER NOT NULL,
    "criteria" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "score" DOUBLE PRECISION,
    "comments" TEXT,

    CONSTRAINT "performance_review_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_calendars" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "working_hours" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_events" (
    "id" SERIAL NOT NULL,
    "calendar_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "type" "public"."EventType" NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "reminder" TIMESTAMP(3),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_off_requests" (
    "id" SERIAL NOT NULL,
    "calendar_id" INTEGER NOT NULL,
    "time_off_type" "public"."TimeOffType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."TimeOffStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "approved_by_id" INTEGER,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_off_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "id" SERIAL NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT false,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_approve" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_MissionToQuote" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MissionToQuote_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "public"."services"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_number_key" ON "public"."customers"("customer_number");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "public"."products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quote_number_key" ON "public"."quotes"("quote_number");

-- CreateIndex
CREATE UNIQUE INDEX "quote_approvals_quote_id_approval_level_key" ON "public"."quote_approvals"("quote_id", "approval_level");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "public"."invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_number_key" ON "public"."payments"("payment_number");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_name_key" ON "public"."accounts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_account_number_key" ON "public"."accounts"("account_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_number_key" ON "public"."employees"("employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_registration_number_key" ON "public"."employees"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "public"."employees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "loans_loan_number_key" ON "public"."loans"("loan_number");

-- CreateIndex
CREATE UNIQUE INDEX "specialites_libelle_key" ON "public"."specialites"("libelle");

-- CreateIndex
CREATE UNIQUE INDEX "techniciens_utilisateur_id_key" ON "public"."techniciens"("utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "missions_num_intervention_key" ON "public"."missions"("num_intervention");

-- CreateIndex
CREATE UNIQUE INDEX "technicien_interventions_technicien_id_intervention_id_key" ON "public"."technicien_interventions"("technicien_id", "intervention_id");

-- CreateIndex
CREATE UNIQUE INDEX "materiels_reference_key" ON "public"."materiels"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "public"."suppliers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_order_number_key" ON "public"."purchase_orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipts_receipt_number_key" ON "public"."purchase_receipts"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "user_calendars_user_id_date_key" ON "public"."user_calendars"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "public"."permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permission_id_key" ON "public"."role_permissions"("role", "permission_id");

-- CreateIndex
CREATE INDEX "_MissionToQuote_B_index" ON "public"."_MissionToQuote"("B");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_prices" ADD CONSTRAINT "product_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_customer_address_id_fkey" FOREIGN KEY ("customer_address_id") REFERENCES "public"."customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_service_manager_approved_by_fkey" FOREIGN KEY ("service_manager_approved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_dg_approved_by_fkey" FOREIGN KEY ("dg_approved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_items" ADD CONSTRAINT "quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_approvals" ADD CONSTRAINT "quote_approvals_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_approvals" ADD CONSTRAINT "quote_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_customer_address_id_fkey" FOREIGN KEY ("customer_address_id") REFERENCES "public"."customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_invoices" ADD CONSTRAINT "recurring_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_invoices" ADD CONSTRAINT "recurring_invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_invoice_items" ADD CONSTRAINT "recurring_invoice_items_recurring_invoice_id_fkey" FOREIGN KEY ("recurring_invoice_id") REFERENCES "public"."recurring_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_invoice_items" ADD CONSTRAINT "recurring_invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminders" ADD CONSTRAINT "reminders_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminders" ADD CONSTRAINT "reminders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."accounting_entries" ADD CONSTRAINT "accounting_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."accounting_entries" ADD CONSTRAINT "accounting_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_flows" ADD CONSTRAINT "cash_flows_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_flows" ADD CONSTRAINT "cash_flows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contracts" ADD CONSTRAINT "contracts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salaries" ADD CONSTRAINT "salaries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_requests" ADD CONSTRAINT "leave_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prospects" ADD CONSTRAINT "prospects_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prospects" ADD CONSTRAINT "prospects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prospect_activities" ADD CONSTRAINT "prospect_activities_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prospect_activities" ADD CONSTRAINT "prospect_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loans" ADD CONSTRAINT "loans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loan_payments" ADD CONSTRAINT "loan_payments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loan_payments" ADD CONSTRAINT "loan_payments_salary_id_fkey" FOREIGN KEY ("salary_id") REFERENCES "public"."salaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."techniciens" ADD CONSTRAINT "techniciens_specialite_id_fkey" FOREIGN KEY ("specialite_id") REFERENCES "public"."specialites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."techniciens" ADD CONSTRAINT "techniciens_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."techniciens" ADD CONSTRAINT "techniciens_current_mission_id_fkey" FOREIGN KEY ("current_mission_id") REFERENCES "public"."missions"("num_intervention") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."missions" ADD CONSTRAINT "missions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."interventions" ADD CONSTRAINT "interventions_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("num_intervention") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."technicien_interventions" ADD CONSTRAINT "technicien_interventions_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "public"."techniciens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."technicien_interventions" ADD CONSTRAINT "technicien_interventions_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rapports_mission" ADD CONSTRAINT "rapports_mission_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rapports_mission" ADD CONSTRAINT "rapports_mission_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "public"."techniciens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rapports_mission" ADD CONSTRAINT "rapports_mission_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("num_intervention") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rapport_images" ADD CONSTRAINT "rapport_images_rapport_id_fkey" FOREIGN KEY ("rapport_id") REFERENCES "public"."rapports_mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sorties_materiel" ADD CONSTRAINT "sorties_materiel_materiel_id_fkey" FOREIGN KEY ("materiel_id") REFERENCES "public"."materiels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sorties_materiel" ADD CONSTRAINT "sorties_materiel_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sorties_materiel" ADD CONSTRAINT "sorties_materiel_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "public"."techniciens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."client_projects" ADD CONSTRAINT "client_projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."client_projects" ADD CONSTRAINT "client_projects_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."client_projects" ADD CONSTRAINT "client_projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."client_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_tasks" ADD CONSTRAINT "project_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_documents" ADD CONSTRAINT "project_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."client_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_documents" ADD CONSTRAINT "project_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_receipts" ADD CONSTRAINT "purchase_receipts_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_receipt_id_fkey" FOREIGN KEY ("purchase_receipt_id") REFERENCES "public"."purchase_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_review_criteria" ADD CONSTRAINT "performance_review_criteria_performance_review_id_fkey" FOREIGN KEY ("performance_review_id") REFERENCES "public"."performance_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_calendars" ADD CONSTRAINT "user_calendars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "public"."user_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_off_requests" ADD CONSTRAINT "time_off_requests_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "public"."user_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_off_requests" ADD CONSTRAINT "time_off_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MissionToQuote" ADD CONSTRAINT "_MissionToQuote_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."missions"("num_intervention") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MissionToQuote" ADD CONSTRAINT "_MissionToQuote_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
