const { sequelize } = require('../config/database');

// Import model definition functions
const defineUser = require('./User');
const defineBusiness = require('./Business');
const defineBusinessUser = require('./BusinessUser');
const defineOutlet = require('./Outlet');
const defineUserOutlet = require('./UserOutlet');
const defineRole = require('./Role');
const definePermission = require('./Permission');
const defineRolePermission = require('./RolePermission');
const defineUserRole = require('./UserRole');

// Phase 5: Product Management Models
const defineCategory = require('./Category');
const defineProduct = require('./Product');
const defineProductVariant = require('./ProductVariant');
const defineModifier = require('./Modifier');
const defineModifierOption = require('./ModifierOption');
const defineProductModifier = require('./ProductModifier');

// Phase 6: Inventory & Recipe Models
const defineUnit = require('./Unit');
const defineIngredient = require('./Ingredient');
const defineStockMovement = require('./StockMovement');
const defineRecipe = require('./Recipe');
const defineRecipeItem = require('./RecipeItem');

// Phase 7: POS & Transaction Models
const defineTransaction = require('./Transaction');
const defineTransactionItem = require('./TransactionItem');
const defineTransactionItemModifier = require('./TransactionItemModifier');
const definePayment = require('./Payment');

// Phase 8: Expense & Report Models
const defineExpenseCategory = require('./ExpenseCategory');
const defineExpense = require('./Expense');

// Phase 9: Subscription Models
const defineSubscriptionPlan = require('./SubscriptionPlan');
const defineSubscription = require('./Subscription');
const defineSubscriptionInvoice = require('./SubscriptionInvoice');

// Phase 11: Audit Log Model
const defineAuditLog = require('./AuditLog');

// Initialize models
const models = {
  User: defineUser(sequelize),
  Business: defineBusiness(sequelize),
  BusinessUser: defineBusinessUser(sequelize),
  Outlet: defineOutlet(sequelize),
  UserOutlet: defineUserOutlet(sequelize),
  Role: defineRole(sequelize),
  Permission: definePermission(sequelize),
  RolePermission: defineRolePermission(sequelize),
  UserRole: defineUserRole(sequelize),

  // Product models
  Category: defineCategory(sequelize),
  Product: defineProduct(sequelize),
  ProductVariant: defineProductVariant(sequelize),
  Modifier: defineModifier(sequelize),
  ModifierOption: defineModifierOption(sequelize),
  ProductModifier: defineProductModifier(sequelize),

  // Inventory & Recipe models
  Unit: defineUnit(sequelize),
  Ingredient: defineIngredient(sequelize),
  StockMovement: defineStockMovement(sequelize),
  Recipe: defineRecipe(sequelize),
  RecipeItem: defineRecipeItem(sequelize),

  // POS & Transaction models
  Transaction: defineTransaction(sequelize),
  TransactionItem: defineTransactionItem(sequelize),
  TransactionItemModifier: defineTransactionItemModifier(sequelize),
  Payment: definePayment(sequelize),

  // Expense models
  ExpenseCategory: defineExpenseCategory(sequelize),
  Expense: defineExpense(sequelize),

  // Subscription models
  SubscriptionPlan: defineSubscriptionPlan(sequelize),
  Subscription: defineSubscription(sequelize),
  SubscriptionInvoice: defineSubscriptionInvoice(sequelize),

  // Audit Log
  AuditLog: defineAuditLog(sequelize)
};

// Destructure models for associations setup
const {
  User,
  Business,
  BusinessUser,
  Outlet,
  UserOutlet,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Category,
  Product,
  ProductVariant,
  Modifier,
  ModifierOption,
  ProductModifier,
  Unit,
  Ingredient,
  StockMovement,
  Recipe,
  RecipeItem,
  Transaction,
  TransactionItem,
  TransactionItemModifier,
  Payment,
  ExpenseCategory,
  Expense,
  SubscriptionPlan,
  Subscription,
  SubscriptionInvoice,
  AuditLog
} = models;

// 1. User & Business Ownership
User.hasMany(Business, { foreignKey: 'owner_id', as: 'ownedBusinesses' });
Business.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// 2. Business Membership (User <-> Business via BusinessUser)
User.hasMany(BusinessUser, { foreignKey: 'user_id', as: 'businessMemberships' });
BusinessUser.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Business.hasMany(BusinessUser, { foreignKey: 'business_id', as: 'members' });
BusinessUser.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

User.belongsToMany(Business, { through: BusinessUser, foreignKey: 'user_id', otherKey: 'business_id', as: 'businesses' });
Business.belongsToMany(User, { through: BusinessUser, foreignKey: 'business_id', otherKey: 'user_id', as: 'users' });

// 3. Business & Outlets
Business.hasMany(Outlet, { foreignKey: 'business_id', as: 'outlets' });
Outlet.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// 4. User & Outlet Access Scope (User <-> Outlet via UserOutlet)
User.hasMany(UserOutlet, { foreignKey: 'user_id', as: 'userOutlets' });
UserOutlet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Outlet.hasMany(UserOutlet, { foreignKey: 'outlet_id', as: 'outletUsers' });
UserOutlet.belongsTo(Outlet, { foreignKey: 'outlet_id', as: 'outlet' });

User.belongsToMany(Outlet, { through: UserOutlet, foreignKey: 'user_id', otherKey: 'outlet_id', as: 'outlets' });
Outlet.belongsToMany(User, { through: UserOutlet, foreignKey: 'outlet_id', otherKey: 'user_id', as: 'users' });

// 5. Business & Roles
Business.hasMany(Role, { foreignKey: 'business_id', as: 'roles' });
Role.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// 6. Roles & Permissions (Role <-> Permission via RolePermission)
Role.hasMany(RolePermission, { foreignKey: 'role_id', as: 'rolePermissions' });
RolePermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

Permission.hasMany(RolePermission, { foreignKey: 'permission_id', as: 'permissionRoles' });
RolePermission.belongsTo(Permission, { foreignKey: 'permission_id', as: 'permission' });

Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', otherKey: 'permission_id', as: 'permissions' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', otherKey: 'role_id', as: 'roles' });

// 7. BusinessUser & Roles (BusinessUser <-> Role via UserRole)
BusinessUser.hasMany(UserRole, { foreignKey: 'business_user_id', as: 'userRoles' });
UserRole.belongsTo(BusinessUser, { foreignKey: 'business_user_id', as: 'businessUser' });

Role.hasMany(UserRole, { foreignKey: 'role_id', as: 'assignedUsers' });
UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

BusinessUser.belongsToMany(Role, { through: UserRole, foreignKey: 'business_user_id', otherKey: 'role_id', as: 'roles' });
Role.belongsToMany(BusinessUser, { through: UserRole, foreignKey: 'role_id', otherKey: 'business_user_id', as: 'businessUsers' });

// 8. Categories (Business <-> Category <-> Products)
Business.hasMany(Category, { foreignKey: 'business_id', as: 'categories' });
Category.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// 9. Products & Variants (Business <-> Product <-> ProductVariants)
Business.hasMany(Product, { foreignKey: 'business_id', as: 'products' });
Product.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// 10. Modifiers & Options (Business <-> Modifier <-> ModifierOptions)
Business.hasMany(Modifier, { foreignKey: 'business_id', as: 'modifiers' });
Modifier.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Modifier.hasMany(ModifierOption, { foreignKey: 'modifier_id', as: 'options' });
ModifierOption.belongsTo(Modifier, { foreignKey: 'modifier_id', as: 'modifier' });

// 11. Product <-> Modifier (Many-to-Many via ProductModifier)
Product.belongsToMany(Modifier, { through: ProductModifier, foreignKey: 'product_id', otherKey: 'modifier_id', as: 'modifiers' });
Modifier.belongsToMany(Product, { through: ProductModifier, foreignKey: 'modifier_id', otherKey: 'product_id', as: 'products' });

Product.hasMany(ProductModifier, { foreignKey: 'product_id', as: 'productModifiers' });
ProductModifier.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Modifier.hasMany(ProductModifier, { foreignKey: 'modifier_id', as: 'modifierProducts' });
ProductModifier.belongsTo(Modifier, { foreignKey: 'modifier_id', as: 'modifier' });

// 12. Units & Ingredients
Business.hasMany(Unit, { foreignKey: 'business_id', as: 'units' });
Unit.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Ingredient, { foreignKey: 'business_id', as: 'ingredients' });
Ingredient.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Unit.hasMany(Ingredient, { foreignKey: 'unit_id', as: 'ingredients' });
Ingredient.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' });

// 13. Stock Movements (Business, Outlet, Ingredient, User)
Business.hasMany(StockMovement, { foreignKey: 'business_id', as: 'stockMovements' });
StockMovement.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Outlet.hasMany(StockMovement, { foreignKey: 'outlet_id', as: 'stockMovements' });
StockMovement.belongsTo(Outlet, { foreignKey: 'outlet_id', as: 'outlet' });

Ingredient.hasMany(StockMovement, { foreignKey: 'ingredient_id', as: 'stockMovements' });
StockMovement.belongsTo(Ingredient, { foreignKey: 'ingredient_id', as: 'ingredient' });

User.hasMany(StockMovement, { foreignKey: 'created_by', as: 'recordedMovements' });
StockMovement.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 14. Recipes & Recipe Items
Business.hasMany(Recipe, { foreignKey: 'business_id', as: 'recipes' });
Recipe.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Product.hasMany(Recipe, { foreignKey: 'product_id', as: 'recipes' });
Recipe.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

ProductVariant.hasMany(Recipe, { foreignKey: 'product_variant_id', as: 'recipes' });
Recipe.belongsTo(ProductVariant, { foreignKey: 'product_variant_id', as: 'variant' });

Recipe.hasMany(RecipeItem, { foreignKey: 'recipe_id', as: 'items' });
RecipeItem.belongsTo(Recipe, { foreignKey: 'recipe_id', as: 'recipe' });

Ingredient.hasMany(RecipeItem, { foreignKey: 'ingredient_id', as: 'recipeItems' });
RecipeItem.belongsTo(Ingredient, { foreignKey: 'ingredient_id', as: 'ingredient' });

// 15. POS & Transactions
Business.hasMany(Transaction, { foreignKey: 'business_id', as: 'transactions' });
Transaction.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Outlet.hasMany(Transaction, { foreignKey: 'outlet_id', as: 'transactions' });
Transaction.belongsTo(Outlet, { foreignKey: 'outlet_id', as: 'outlet' });

User.hasMany(Transaction, { foreignKey: 'user_id', as: 'salesTransactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'cashier' });

Transaction.hasMany(TransactionItem, { foreignKey: 'transaction_id', as: 'items' });
TransactionItem.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });

Product.hasMany(TransactionItem, { foreignKey: 'product_id', as: 'transactionItems' });
TransactionItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

ProductVariant.hasMany(TransactionItem, { foreignKey: 'variant_id', as: 'transactionItems' });
TransactionItem.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });

TransactionItem.hasMany(TransactionItemModifier, { foreignKey: 'transaction_item_id', as: 'modifiers' });
TransactionItemModifier.belongsTo(TransactionItem, { foreignKey: 'transaction_item_id', as: 'item' });

Modifier.hasMany(TransactionItemModifier, { foreignKey: 'modifier_id', as: 'itemModifiers' });
TransactionItemModifier.belongsTo(Modifier, { foreignKey: 'modifier_id', as: 'modifier' });

ModifierOption.hasMany(TransactionItemModifier, { foreignKey: 'modifier_option_id', as: 'itemModifiers' });
TransactionItemModifier.belongsTo(ModifierOption, { foreignKey: 'modifier_option_id', as: 'modifierOption' });

Transaction.hasOne(Payment, { foreignKey: 'transaction_id', as: 'payment' });
Payment.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });

// 16. Expenses & Expense Categories
Business.hasMany(ExpenseCategory, { foreignKey: 'business_id', as: 'expenseCategories' });
ExpenseCategory.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Expense, { foreignKey: 'business_id', as: 'expenses' });
Expense.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Outlet.hasMany(Expense, { foreignKey: 'outlet_id', as: 'expenses' });
Expense.belongsTo(Outlet, { foreignKey: 'outlet_id', as: 'outlet' });

ExpenseCategory.hasMany(Expense, { foreignKey: 'category_id', as: 'expenses' });
Expense.belongsTo(ExpenseCategory, { foreignKey: 'category_id', as: 'category' });

User.hasMany(Expense, { foreignKey: 'user_id', as: 'recordedExpenses' });
Expense.belongsTo(User, { foreignKey: 'user_id', as: 'recorder' });

// 17. Subscriptions & Plans
Business.hasMany(Subscription, { foreignKey: 'business_id', as: 'subscriptions' });
Subscription.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

SubscriptionPlan.hasMany(Subscription, { foreignKey: 'plan_id', as: 'subscriptions' });
Subscription.belongsTo(SubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });

// 18. Subscription Invoices
Business.hasMany(SubscriptionInvoice, { foreignKey: 'business_id', as: 'subscriptionInvoices' });
SubscriptionInvoice.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

SubscriptionPlan.hasMany(SubscriptionInvoice, { foreignKey: 'plan_id', as: 'invoices' });
SubscriptionInvoice.belongsTo(SubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });

Subscription.hasMany(SubscriptionInvoice, { foreignKey: 'subscription_id', as: 'invoices' });
SubscriptionInvoice.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

// 19. Audit Logs
Business.hasMany(AuditLog, { foreignKey: 'business_id', as: 'auditLogs' });
AuditLog.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  ...models,
  sequelize
};
