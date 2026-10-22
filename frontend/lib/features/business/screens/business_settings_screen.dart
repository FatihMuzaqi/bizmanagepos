import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/ui_helpers.dart';
import '../providers/business_provider.dart';
import 'add_cashier_dialog.dart';
import 'business_selector_screen.dart';

class BusinessSettingsScreen extends StatefulWidget {
  const BusinessSettingsScreen({super.key});

  @override
  State<BusinessSettingsScreen> createState() => _BusinessSettingsScreenState();
}

class _BusinessSettingsScreenState extends State<BusinessSettingsScreen> {
  final _nameController = TextEditingController();
  final _legalNameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final biz = context.read<BusinessProvider>();
      biz.fetchCurrentBusiness().then((_) {
        final cur = biz.currentBusiness;
        if (cur != null) {
          _nameController.text = cur['name'] ?? '';
          _legalNameController.text = cur['legal_name'] ?? '';
        }
      });
      biz.fetchMembers();
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _legalNameController.dispose();
    super.dispose();
  }

  void _saveBusinessProfile() async {
    try {
      await context.read<BusinessProvider>().updateBusinessProfile({
        'name': _nameController.text.trim(),
        'legal_name': _legalNameController.text.trim(),
      });
      if (mounted) {
        UiHelpers.showSnackBar(context, 'Profil bisnis berhasil diperbarui', isSuccess: true);
      }
    } catch (e) {
      if (mounted) {
        UiHelpers.showSnackBar(context, 'Gagal memperbarui: $e', isError: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final businessProvider = context.watch<BusinessProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Pengaturan Bisnis & Staf'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 700),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Switch Business Card
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        const CircleAvatar(
                          backgroundColor: AppColors.secondaryContainer,
                          child: Icon(Icons.swap_horiz_rounded, color: AppColors.secondary),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                businessProvider.activeBusinessName ?? 'Konteks Bisnis',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                              const Text('Beralih ke akun bisnis / toko lainnya', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const BusinessSelectorScreen()),
                            );
                          },
                          child: const Text('Ganti Toko'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Business Profile Form
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Informasi Profil Usaha',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _nameController,
                          decoration: const InputDecoration(
                            labelText: 'Nama Brand / Usaha *',
                            hintText: 'Contoh: Es Teh Nusantara',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _legalNameController,
                          decoration: const InputDecoration(
                            labelText: 'Nama Badan Usaha / Hukum (PT / CV / UD)',
                            hintText: 'Contoh: CV Teh Berkah Nusantara',
                          ),
                        ),
                        const SizedBox(height: 16),
                        Align(
                          alignment: Alignment.centerRight,
                          child: ElevatedButton(
                            onPressed: _saveBusinessProfile,
                            child: const Text('Simpan Perubahan'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Team Members List
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Daftar Kasir & Tim Staf',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                Text(
                                  '${businessProvider.members.length} anggota terdaftar',
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                ),
                              ],
                            ),
                            ElevatedButton.icon(
                              onPressed: () {
                                showDialog(
                                  context: context,
                                  builder: (_) => const AddCashierDialog(),
                                );
                              },
                              icon: const Icon(Icons.person_add_alt_1_rounded, size: 16),
                              label: const Text('Tambah Kasir'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        if (businessProvider.members.isEmpty)
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16),
                              child: Text('Belum ada staf kasir. Klik "+ Tambah Kasir" untuk menambahkan.'),
                            ),
                          )
                        else
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: businessProvider.members.length,
                            separatorBuilder: (_, __) => const Divider(height: 16),
                            itemBuilder: (ctx, idx) {
                              final mem = businessProvider.members[idx];
                              final user = mem['user'] ?? mem;
                              final isOwner = mem['is_owner'] == true;
                              
                              // Extract roles
                              String roleLabel = 'Staff';
                              if (isOwner) {
                                roleLabel = 'Owner';
                              } else if (mem['roles'] is List && (mem['roles'] as List).isNotEmpty) {
                                final rList = mem['roles'] as List;
                                roleLabel = rList.map((r) => r is Map ? r['name'] : r.toString()).join(', ');
                              }

                              // Extract assigned outlets
                              final outlets = (mem['outlets'] as List? ?? []).cast<Map<String, dynamic>>();

                              return Container(
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    CircleAvatar(
                                      radius: 20,
                                      backgroundColor: isOwner ? AppColors.primaryContainer : AppColors.secondaryContainer,
                                      child: Icon(
                                        isOwner ? Icons.person_pin_rounded : Icons.person_rounded,
                                        color: isOwner ? AppColors.primary : AppColors.secondary,
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Flexible(
                                                child: Text(
                                                  user['name'] ?? 'Staff',
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: isOwner ? AppColors.primaryContainer : AppColors.secondaryContainer,
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Text(
                                                  roleLabel,
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: isOwner ? AppColors.primary : AppColors.secondary,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            user['email'] ?? (user['phone'] ?? ''),
                                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                          ),
                                          if (outlets.isNotEmpty) ...[
                                            const SizedBox(height: 6),
                                            Wrap(
                                              spacing: 6,
                                              runSpacing: 4,
                                              children: outlets.map((o) {
                                                return Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: AppColors.cardBackground,
                                                    border: Border.all(color: AppColors.cardBorder),
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  child: Row(
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: [
                                                      const Icon(Icons.storefront_rounded, size: 10, color: AppColors.primary),
                                                      const SizedBox(width: 3),
                                                      Text(
                                                        o['name'] ?? 'Outlet',
                                                        style: const TextStyle(fontSize: 10, color: AppColors.textPrimary, fontWeight: FontWeight.w500),
                                                      ),
                                                    ],
                                                  ),
                                                );
                                              }).toList(),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    if (!isOwner)
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline_rounded, size: 20, color: AppColors.error),
                                        tooltip: 'Hapus Akses Staf',
                                        onPressed: () async {
                                          final userId = mem['user_id'] ?? user['id'];
                                          if (userId == null) return;
                                          final confirmed = await UiHelpers.showConfirmDialog(
                                            context,
                                            title: 'Hapus Akses Kasir?',
                                            content: 'Apakah Anda yakin ingin menghapus akses untuk staf ${user['name']}?',
                                          );
                                          if (confirmed == true && context.mounted) {
                                            try {
                                              await context.read<BusinessProvider>().removeMember(userId as int);
                                              if (context.mounted) {
                                                UiHelpers.showSnackBar(context, 'Akses staf berhasil dihapus', isSuccess: true);
                                              }
                                            } catch (e) {
                                              if (context.mounted) {
                                                UiHelpers.showSnackBar(context, 'Gagal menghapus: $e', isError: true);
                                              }
                                            }
                                          }
                                        },
                                      ),
                                  ],
                                ),
                              );
                            },
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
