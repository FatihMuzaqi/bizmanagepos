class ApiEndpoints {
  // Auth
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String refreshToken = '/auth/refresh-token';
  static const String getProfile = '/auth/me';
  static const String updateProfile = '/auth/profile';
  static const String updatePassword = '/auth/password';

  // Business Context & Management
  static const String myBusinesses = '/businesses/my';
  static const String createBusiness = '/businesses';
  static const String selectBusiness = '/businesses/select';
  static const String currentBusiness = '/business';
  static const String businessMembers = '/business/members';

  // Outlets
  static const String outlets = '/outlets';

  // RBAC
  static const String myPermissions = '/my-permissions';
  static const String permissions = '/permissions';
  static const String roles = '/roles';

  // Products & Modifiers
  static const String categories = '/categories';
  static const String products = '/products';
  static const String modifiers = '/modifiers';

  // Inventory & Recipes
  static const String units = '/units';
  static const String ingredients = '/ingredients';
  static const String stock = '/inventory/stock';
  static const String stockMovements = '/inventory/movements';
  static const String stockIn = '/inventory/stock-in';
  static const String stockOut = '/inventory/stock-out';
  static const String stockAdjustment = '/inventory/adjustment';
  static const String recipes = '/recipes';

  // POS & Transactions
  static const String transactions = '/transactions';

  // Expenses
  static const String expenseCategories = '/expense-categories';
  static const String expenses = '/expenses';

  // Reports & Dashboard
  static const String dashboardReport = '/reports/dashboard';
  static const String salesReport = '/reports/sales';
  static const String productReport = '/reports/products';
  static const String outletReport = '/reports/outlets';
  static const String expenseReport = '/reports/expenses';

  // SaaS Subscription & Midtrans Payment
  static const String subscriptionPlans = '/subscription/plans';
  static const String subscription = '/subscription';
  static const String upgradeSubscription = '/subscription/upgrade';
  static const String subscriptionCheckout = '/subscription/checkout';
  static const String subscriptionCheckPayment = '/subscription/check-payment';
  static const String subscriptionInvoices = '/subscription/invoices';
}

