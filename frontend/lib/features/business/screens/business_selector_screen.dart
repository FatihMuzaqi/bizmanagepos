import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/ui_helpers.dart';
import '../providers/business_provider.dart';

class BusinessSelectorScreen extends StatefulWidget {
  const BusinessSelectorScreen({super.key});

  @override
  State<BusinessSelectorScreen> createState() => _BusinessSelectorScreenState();
}

class _BusinessSelectorScreenState extends State<BusinessSelectorScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BusinessProvider>().fetchMyBusinesses();
    });
  }

  void _showCreateBusinessDialog() {
    final nameController = TextEditingController();
    final outletController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Tambah Bisnis / Usaha Baru'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: 'Nama Usaha / Toko *',
                hintText: 'Contoh: Kedai Kopi Mantap, Es Teh Juara',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: outletController,
              decoration: const InputDecoration(
                labelText: 'Nama Cabang Pertama (Opsional)',
                hintText: 'Contoh: Outlet Pusat, Cabang 1',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.trim().isEmpty) return;
              Navigator.of(ctx).pop();
              try {
                final res = await context.read<BusinessProvider>().createBusiness({
                  'name': nameController.text.trim(),
                  if (outletController.text.trim().isNotEmpty)
                    'outlet_name': outletController.text.trim(),
                });
                if (mounted) {
                  final bizId = res['id'] as int;
                  await context.read<BusinessProvider>().selectBusiness(context, bizId);
                }
              } catch (e) {
                if (mounted) {
                  UiHelpers.showSnackBar(context, 'Gagal membuat bisnis: $e', isError: true);
                }
              }
            },
            child: const Text('Buat & Buka Usaha'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final businessProvider = context.watch<BusinessProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.asset('assets/images/app_logo.png', fit: BoxFit.cover),
              ),
            ),
            const SizedBox(width: 10),
            const Text('Pilih Bisnis / Toko'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_business_rounded),
            tooltip: 'Tambah Bisnis Baru',
            onPressed: _showCreateBusinessDialog,
          ),
        ],
      ),
      body: businessProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : businessProvider.myBusinesses.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.storefront_outlined, size: 64, color: AppColors.textTertiary),
                      const SizedBox(height: 16),
                      const Text(
                        'Belum ada bisnis terdaftar',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      const Text('Buat bisnis pertama Anda untuk memulai.'),
                      const SizedBox(height: 20),
                      ElevatedButton.icon(
                        onPressed: _showCreateBusinessDialog,
                        icon: const Icon(Icons.add),
                        label: const Text('Tambah Bisnis Baru'),
                      ),
                    ],
                  ),
                )
              : Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 600),
                    child: ListView.separated(
                      padding: const EdgeInsets.all(20),
                      itemCount: businessProvider.myBusinesses.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (ctx, index) {
                        final biz = businessProvider.myBusinesses[index];
                        final isOwner = biz['is_owner'] == true;
                        final roles = (biz['roles'] as List? ?? []).join(', ');

                        return Card(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: AppColors.cardBorder),
                          ),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () async {
                              await businessProvider.selectBusiness(
                                context,
                                biz['id'] as int,
                              );
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: isOwner
                                          ? AppColors.primaryContainer
                                          : AppColors.secondaryContainer,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(
                                      Icons.storefront_rounded,
                                      color: isOwner ? AppColors.primary : AppColors.secondary,
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          biz['name'] ?? 'Bisnis Tanpa Nama',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          isOwner ? 'Pemilik Usaha (Akses Penuh)' : 'Peran: $roles',
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: isOwner ? AppColors.primary : AppColors.textSecondary,
                                            fontWeight: isOwner ? FontWeight.w600 : FontWeight.normal,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: AppColors.textTertiary),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
    );
  }
}
