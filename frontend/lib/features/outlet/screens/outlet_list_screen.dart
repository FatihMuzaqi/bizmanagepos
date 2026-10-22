import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/ui_helpers.dart';
import '../../business/screens/add_cashier_dialog.dart';
import '../providers/outlet_provider.dart';

class OutletListScreen extends StatefulWidget {
  const OutletListScreen({super.key});

  @override
  State<OutletListScreen> createState() => _OutletListScreenState();
}

class _OutletListScreenState extends State<OutletListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OutletProvider>().fetchOutlets();
    });
  }

  void _showOutletDialog([Map<String, dynamic>? existing]) {
    final nameController = TextEditingController(text: existing?['name'] ?? '');
    final codeController = TextEditingController(text: existing?['code'] ?? '');
    final addressController = TextEditingController(text: existing?['address'] ?? '');
    final phoneController = TextEditingController(text: existing?['phone'] ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? 'Tambah Cabang / Outlet Baru' : 'Edit Data Cabang'),
        content: SizedBox(
          width: 420,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Nama Cabang *', hintText: 'Contoh: Cabang Slawi Square'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: codeController,
                  decoration: const InputDecoration(labelText: 'Kode Cabang (Opsional)', hintText: 'Contoh: SLW-01'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: addressController,
                  decoration: const InputDecoration(labelText: 'Alamat Cabang', hintText: 'Jl. Ahmad Yani No. 12'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Nomor Telepon / WhatsApp', hintText: '08123456789'),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Batal')),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.trim().isEmpty) return;
              Navigator.of(ctx).pop();

              final outletProvider = context.read<OutletProvider>();
              try {
                if (existing == null) {
                  await outletProvider.createOutlet({
                    'name': nameController.text.trim(),
                    if (codeController.text.trim().isNotEmpty) 'code': codeController.text.trim(),
                    if (addressController.text.trim().isNotEmpty) 'address': addressController.text.trim(),
                    if (phoneController.text.trim().isNotEmpty) 'phone': phoneController.text.trim(),
                  });
                } else {
                  await outletProvider.updateOutlet(existing['id'] as int, {
                    'name': nameController.text.trim(),
                    if (codeController.text.trim().isNotEmpty) 'code': codeController.text.trim(),
                    if (addressController.text.trim().isNotEmpty) 'address': addressController.text.trim(),
                    if (phoneController.text.trim().isNotEmpty) 'phone': phoneController.text.trim(),
                  });
                }
                if (mounted) {
                  UiHelpers.showSnackBar(context, 'Data cabang berhasil disimpan', isSuccess: true);
                }
              } catch (e) {
                if (mounted) {
                  UiHelpers.showSnackBar(context, 'Gagal menyimpan cabang: $e', isError: true);
                }
              }
            },
            child: const Text('Simpan Cabang'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final outletProvider = context.watch<OutletProvider>();
    final authProvider = context.watch<AuthProvider>();
    final canCreate = authProvider.hasPermission('outlet.create') || authProvider.isOwner;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Manajemen Cabang / Outlet'),
        actions: [
          if (canCreate)
            IconButton(
              icon: const Icon(Icons.add_business_rounded),
              tooltip: 'Tambah Cabang',
              onPressed: () => _showOutletDialog(),
            ),
        ],
      ),
      body: outletProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : outletProvider.outlets.isEmpty
              ? const Center(child: Text('Belum ada cabang terdaftar'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: outletProvider.outlets.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, index) {
                    final o = outletProvider.outlets[index];
                    final id = o['id'] as int;
                    final name = o['name'] ?? '';
                    final code = o['code'] ?? '';
                    final address = o['address'];
                    final phone = o['phone'];
                    final isCurrent = outletProvider.activeOutletId == id;
                    final cashiers = (o['cashiers'] as List? ?? o['users'] as List? ?? []).cast<Map<String, dynamic>>();

                    return Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(
                          color: isCurrent ? AppColors.primary : AppColors.cardBorder,
                          width: isCurrent ? 2 : 1,
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 22,
                                  backgroundColor: isCurrent ? AppColors.primaryContainer : AppColors.secondaryContainer,
                                  child: Icon(
                                    Icons.storefront_rounded,
                                    color: isCurrent ? AppColors.primary : AppColors.secondary,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Flexible(
                                            child: Text(
                                              name,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          if (isCurrent) ...[
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AppColors.primaryContainer,
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: const Text(
                                                'Outlet Aktif',
                                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${code.isNotEmpty ? 'Kode: $code • ' : ''}${address ?? 'Alamat belum diatur'}',
                                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                      ),
                                      if (phone != null && phone.isNotEmpty)
                                        Text('No HP: $phone', style: const TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                                    ],
                                  ),
                                ),
                                if (canCreate)
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined, size: 18),
                                    tooltip: 'Edit Cabang',
                                    onPressed: () => _showOutletDialog(o),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Section: Daftar Kasir & Staf Bertugas
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.cardBackground,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.cardBorder),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          const Icon(Icons.people_alt_rounded, size: 15, color: AppColors.primary),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Kasir & Staf Bertugas (${cashiers.length})',
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.textPrimary,
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (cashiers.isNotEmpty)
                                        Text(
                                          '${cashiers.length} Orang',
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  if (cashiers.isEmpty)
                                    const Row(
                                      children: [
                                        Icon(Icons.info_outline_rounded, size: 14, color: AppColors.textTertiary),
                                        SizedBox(width: 6),
                                        Text(
                                          'Belum ada kasir yang ditugaskan di cabang ini.',
                                          style: TextStyle(fontSize: 11, color: AppColors.textTertiary, fontStyle: FontStyle.italic),
                                        ),
                                      ],
                                    )
                                  else
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 6,
                                      children: cashiers.map((c) {
                                        final cName = c['name'] ?? 'Kasir';
                                        final cRole = c['role'] ?? 'Kasir';
                                        final isOwner = c['is_owner'] == true;

                                        return Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isOwner ? AppColors.primaryContainer.withValues(alpha: 0.5) : Colors.white,
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(
                                              color: isOwner ? AppColors.primary.withValues(alpha: 0.3) : AppColors.cardBorder,
                                            ),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              CircleAvatar(
                                                radius: 9,
                                                backgroundColor: isOwner ? AppColors.primary : AppColors.secondary,
                                                child: Text(
                                                  (cName.toString().isNotEmpty ? cName.toString()[0] : 'K').toUpperCase(),
                                                  style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold),
                                                ),
                                              ),
                                              const SizedBox(width: 6),
                                              Text(
                                                cName,
                                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                              ),
                                              const SizedBox(width: 4),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                                decoration: BoxDecoration(
                                                  color: isOwner ? AppColors.primary.withValues(alpha: 0.15) : AppColors.secondaryContainer,
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  cRole,
                                                  style: TextStyle(
                                                    fontSize: 9,
                                                    fontWeight: FontWeight.bold,
                                                    color: isOwner ? AppColors.primary : AppColors.secondary,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      }).toList(),
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Divider(height: 1),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                // Tombol Tambah Kasir Khusus Outlet Ini
                                TextButton.icon(
                                  onPressed: () async {
                                    final added = await showDialog<bool>(
                                      context: context,
                                      builder: (_) => AddCashierDialog(
                                        preselectedOutletId: id,
                                        preselectedOutletName: name,
                                      ),
                                    );
                                    if (added == true && context.mounted) {
                                      await outletProvider.fetchOutlets();
                                    }
                                  },
                                  icon: const Icon(Icons.person_add_alt_1_rounded, size: 16, color: AppColors.primary),
                                  label: const Text(
                                    '+ Tambah Kasir',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary),
                                  ),
                                ),
                                if (!isCurrent)
                                  ElevatedButton(
                                    onPressed: () async {
                                      await outletProvider.selectOutlet(id, name);
                                      if (mounted) {
                                        UiHelpers.showSnackBar(context, 'Beralih ke cabang $name', isSuccess: true);
                                      }
                                    },
                                    style: ElevatedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: const Text('Beralih Cabang', style: TextStyle(fontSize: 12)),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
