import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/utils/ui_helpers.dart';
import '../providers/expense_provider.dart';

class ExpenseScreen extends StatefulWidget {
  const ExpenseScreen({super.key});

  @override
  State<ExpenseScreen> createState() => _ExpenseScreenState();
}

class _ExpenseScreenState extends State<ExpenseScreen> {
  int? _selectedCategory;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final exp = context.read<ExpenseProvider>();
      exp.fetchCategories();
      exp.fetchExpenses();
    });
  }

  void _showRecordExpenseDialog() {
    final amountController = TextEditingController();
    final descController = TextEditingController();
    int? selectedCatId;
    DateTime selectedDate = DateTime.now();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final categories = context.read<ExpenseProvider>().categories;

          return AlertDialog(
            title: const Text('Catat Pengeluaran Operasional'),
            content: SizedBox(
              width: 420,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<int>(
                      value: selectedCatId,
                      decoration: const InputDecoration(labelText: 'Kategori Biaya *'),
                      items: categories.map((c) {
                        return DropdownMenuItem<int>(
                          value: c['id'] as int,
                          child: Text(c['name'] ?? ''),
                        );
                      }).toList(),
                      onChanged: (val) => setDialogState(() => selectedCatId = val),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Jumlah Biaya (Rp) *',
                        prefixText: 'Rp ',
                        hintText: '50000',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descController,
                      decoration: const InputDecoration(
                        labelText: 'Keterangan / Catatan',
                        hintText: 'Contoh: Pembelian galon air & listrik',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Batal')),
              ElevatedButton(
                onPressed: () async {
                  if (selectedCatId == null) {
                    UiHelpers.showWarning(context, 'Pilih kategori pengeluaran terlebih dahulu', title: 'Kategori Belum Dipilih');
                    return;
                  }
                  final amountText = amountController.text.trim();
                  if (amountText.isEmpty) {
                    UiHelpers.showWarning(context, 'Masukkan nominal pengeluaran', title: 'Nominal Kosong');
                    return;
                  }
                  final amount = double.tryParse(amountText) ?? 0.0;
                  if (amount <= 0) {
                    UiHelpers.showWarning(context, 'Nominal pengeluaran harus lebih dari 0', title: 'Nominal Tidak Valid');
                    return;
                  }
                  Navigator.of(ctx).pop();

                  try {
                    await context.read<ExpenseProvider>().recordExpense(
                          categoryId: selectedCatId!,
                          amount: amount,
                          expenseDate: selectedDate.toIso8601String().substring(0, 10),
                          description: descController.text.trim(),
                        );
                    if (context.mounted) {
                      UiHelpers.showSuccess(
                        context,
                        'Pengeluaran berhasil dicatat ke laporan keuangan',
                        title: 'Pengeluaran Dicatat',
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      UiHelpers.showError(context, e, title: 'Gagal Mencatat Pengeluaran');
                    }
                  }
                },
                child: const Text('Simpan Pengeluaran'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showCategoryManagementDialog() {
    final nameController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final expProvider = context.watch<ExpenseProvider>();

          return AlertDialog(
            title: const Text('Kelola Kategori Pengeluaran'),
            content: SizedBox(
              width: 440,
              height: 380,
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: nameController,
                          decoration: const InputDecoration(labelText: 'Nama Kategori Baru'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.add_circle, color: AppColors.primary),
                        onPressed: () async {
                          if (nameController.text.trim().isEmpty) return;
                          await context.read<ExpenseProvider>().createCategory(nameController.text.trim());
                          nameController.clear();
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(),
                  Expanded(
                    child: ListView.separated(
                      itemCount: expProvider.categories.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 6),
                      itemBuilder: (ctx, idx) {
                        final cat = expProvider.categories[idx];
                        return ListTile(
                          dense: true,
                          title: Text(cat['name'] ?? ''),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                            onPressed: () async {
                              await context.read<ExpenseProvider>().deleteCategory(cat['id'] as int);
                            },
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Selesai')),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final expProvider = context.watch<ExpenseProvider>();
    final authProvider = context.watch<AuthProvider>();
    final canCreate = authProvider.hasPermission('expense.create');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Pencatatan Biaya Operasional'),
        actions: [
          IconButton(
            icon: const Icon(Icons.category_outlined),
            tooltip: 'Kategori Biaya',
            onPressed: _showCategoryManagementDialog,
          ),
          if (canCreate)
            IconButton(
              icon: const Icon(Icons.add_rounded),
              tooltip: 'Catat Biaya',
              onPressed: _showRecordExpenseDialog,
            ),
        ],
      ),
      body: Column(
        children: [
          // Filter Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppColors.surface,
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<int?>(
                    value: _selectedCategory,
                    decoration: const InputDecoration(
                      labelText: 'Filter Berdasarkan Kategori',
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('Semua Kategori Biaya')),
                      ...expProvider.categories.map((c) => DropdownMenuItem(
                            value: c['id'] as int,
                            child: Text(c['name'] ?? ''),
                          )),
                    ],
                    onChanged: (val) {
                      setState(() {
                        _selectedCategory = val;
                      });
                      expProvider.fetchExpenses(categoryId: _selectedCategory);
                    },
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Expenses List
          Expanded(
            child: expProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : expProvider.expenses.isEmpty
                    ? const Center(child: Text('Belum ada pengeluaran dicatat pada periode ini'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: expProvider.expenses.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, index) {
                          final exp = expProvider.expenses[index];
                          final id = exp['id'] as int;
                          final amount = exp['amount'] ?? 0;
                          final numAmount = amount is num ? amount : double.tryParse(amount.toString()) ?? 0;
                          final catName = exp['category']?['name'] ?? 'Biaya Umum';
                          final desc = exp['description'];
                          final date = exp['expense_date'];
                          final status = exp['status'] ?? 'RECORDED';
                          final isCancelled = status == 'CANCELLED';

                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: isCancelled ? AppColors.cardBorder : AppColors.errorContainer,
                                    child: Icon(
                                      Icons.money_off_rounded,
                                      color: isCancelled ? AppColors.textTertiary : AppColors.error,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          catName,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                        if (desc != null && desc.isNotEmpty) ...[
                                          const SizedBox(height: 2),
                                          Text(
                                            desc,
                                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                          ),
                                        ],
                                        const SizedBox(height: 2),
                                        Text(
                                          DateFormatter.formatDate(date),
                                          style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        '- ${CurrencyFormatter.format(numAmount)}',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                          color: isCancelled ? AppColors.textTertiary : AppColors.error,
                                          decoration: isCancelled ? TextDecoration.lineThrough : null,
                                        ),
                                      ),
                                      if (isCancelled)
                                        const Text(
                                          'Dibatalkan',
                                          style: TextStyle(fontSize: 10, color: AppColors.textTertiary),
                                        ),
                                    ],
                                  ),
                                  if (!isCancelled && canCreate) ...[
                                    const SizedBox(width: 8),
                                    IconButton(
                                      icon: const Icon(Icons.cancel_outlined, size: 18, color: AppColors.textTertiary),
                                      tooltip: 'Batalkan Biaya',
                                      onPressed: () async {
                                        final confirmed = await UiHelpers.showConfirmDialog(
                                          context,
                                          title: 'Batalkan Pengeluaran Ini?',
                                          content: 'Apakah Anda yakin ingin membatalkan catatan pengeluaran ini?',
                                          isDestructive: true,
                                        );
                                        if (confirmed == true && context.mounted) {
                                          try {
                                            await expProvider.cancelExpense(id);
                                            if (context.mounted) {
                                              UiHelpers.showSuccess(context, 'Catatan pengeluaran berhasil dibatalkan', title: 'Pengeluaran Dibatalkan');
                                            }
                                          } catch (e) {
                                            if (context.mounted) {
                                              UiHelpers.showError(context, e, title: 'Gagal Membatalkan');
                                            }
                                          }
                                        }
                                      },
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
