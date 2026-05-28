CREATE TYPE "public"."DiscountType" AS ENUM('PERCENTAGE', 'FIXED_AMOUNT');--> statement-breakpoint
CREATE TYPE "public"."OrderStatus" AS ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."PaymentStatus" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."ReturnStatus" AS ENUM('NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."StockMovementType" AS ENUM('RECEIVED', 'SOLD', 'ADJUSTMENT', 'RETURNED', 'DAMAGED', 'TRANSFERRED');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('CUSTOMER', 'ADMIN', 'WAREHOUSE', 'SUPPORT');--> statement-breakpoint
CREATE TABLE "Account" (
	"userId" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "Account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"sessionToken" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"emailVerified" timestamp,
	"image" varchar(255),
	"role" varchar(20) DEFAULT 'CUSTOMER' NOT NULL,
	"phone" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "VerificationToken" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "VerificationToken_identifier_token_pk" PRIMARY KEY("identifier","token"),
	CONSTRAINT "VerificationToken_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "BlogPost" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"coverImage" varchar(255),
	"seoTitle" varchar(255),
	"seoDescription" text,
	"published" boolean DEFAULT false NOT NULL,
	"publishedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"authorId" varchar(255) NOT NULL,
	CONSTRAINT "BlogPost_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "Brand" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"logo" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Brand_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "Category" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"image" varchar(255),
	"parentId" varchar(255),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "CouponProduct" (
	"couponId" varchar(255) NOT NULL,
	"productId" varchar(255) NOT NULL,
	CONSTRAINT "CouponProduct_couponId_productId_unique" UNIQUE("couponId","productId")
);
--> statement-breakpoint
CREATE TABLE "Coupon" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(255) NOT NULL,
	"description" text,
	"discountType" varchar(50) NOT NULL,
	"discountValue" numeric(10, 2) NOT NULL,
	"minOrderAmount" numeric(10, 2),
	"maxUses" integer,
	"usedCount" integer DEFAULT 0 NOT NULL,
	"startsAt" timestamp,
	"expiresAt" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Coupon_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "NewsletterSubscriber" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "NewsletterSubscriber_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "OrderItem" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(10, 2) NOT NULL,
	"totalPrice" numeric(10, 2) NOT NULL,
	"orderId" varchar(255) NOT NULL,
	"productId" varchar(255) NOT NULL,
	"variantId" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "Order" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderNumber" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"shippingCost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"billingName" varchar(255) NOT NULL,
	"billingEmail" varchar(255) NOT NULL,
	"billingPhone" varchar(50),
	"billingAddress" varchar(500) NOT NULL,
	"billingCity" varchar(255) NOT NULL,
	"billingProvince" varchar(255),
	"billingZip" varchar(20) NOT NULL,
	"billingCountry" varchar(10) DEFAULT 'IT' NOT NULL,
	"shippingName" varchar(255),
	"shippingEmail" varchar(255),
	"shippingPhone" varchar(50),
	"shippingAddress" varchar(500),
	"shippingCity" varchar(255),
	"shippingProvince" varchar(255),
	"shippingZip" varchar(20),
	"shippingCountry" varchar(10),
	"shippingMethod" varchar(255),
	"trackingNumber" varchar(255),
	"trackingUrl" varchar(500),
	"paymentMethod" varchar(255),
	"paymentId" varchar(255),
	"paymentStatus" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"paidAt" timestamp,
	"invoiceUrl" varchar(500),
	"returnRequested" boolean DEFAULT false NOT NULL,
	"returnReason" text,
	"returnStatus" varchar(50) DEFAULT 'NONE',
	"returnedAt" timestamp,
	"userId" varchar(255) NOT NULL,
	"couponId" varchar(255),
	CONSTRAINT "Order_orderNumber_unique" UNIQUE("orderNumber")
);
--> statement-breakpoint
CREATE TABLE "ProductImage" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" varchar(500) NOT NULL,
	"alt" varchar(255),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"productId" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProductVariant" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(255),
	"price" numeric(10, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"lowStock" integer DEFAULT 5 NOT NULL,
	"image" varchar(255),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"productId" varchar(255) NOT NULL,
	CONSTRAINT "ProductVariant_productId_name_unique" UNIQUE("productId","name")
);
--> statement-breakpoint
CREATE TABLE "Product" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"content" text,
	"basePrice" numeric(10, 2) NOT NULL,
	"compareAtPrice" numeric(10, 2),
	"costPrice" numeric(10, 2),
	"sku" varchar(255),
	"barcode" varchar(255),
	"weight" numeric(8, 2),
	"seoTitle" varchar(255),
	"seoDescription" text,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"categoryId" varchar(255) NOT NULL,
	"brandId" varchar(255),
	CONSTRAINT "Product_identifier_unique" UNIQUE("identifier"),
	CONSTRAINT "Product_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "Question" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"body" text NOT NULL,
	"answer" text,
	"answeredAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"userId" varchar(255) NOT NULL,
	"productId" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Review" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(255),
	"body" text,
	"approved" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"userId" varchar(255) NOT NULL,
	"productId" varchar(255) NOT NULL,
	CONSTRAINT "Review_userId_productId_unique" UNIQUE("userId","productId")
);
--> statement-breakpoint
CREATE TABLE "StockMovement" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quantity" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"variantId" varchar(255) NOT NULL,
	"userId" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "WishlistItem" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"userId" varchar(255) NOT NULL,
	"productId" varchar(255) NOT NULL,
	CONSTRAINT "WishlistItem_userId_productId_unique" UNIQUE("userId","productId")
);
--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_User_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CouponProduct" ADD CONSTRAINT "CouponProduct_couponId_Coupon_id_fk" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CouponProduct" ADD CONSTRAINT "CouponProduct_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_ProductVariant_id_fk" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_Category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_Brand_id_fk" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Question" ADD CONSTRAINT "Question_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Question" ADD CONSTRAINT "Question_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variantId_ProductVariant_id_fk" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;