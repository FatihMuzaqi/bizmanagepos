import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/ui_helpers.dart';
import '../../outlet/providers/outlet_provider.dart';
import '../providers/business_provider.dart';

class AddCashierDialog extends StatefulWidget {
  final int? preselectedOutletId;
  final String? preselectedOutletName;

  const AddCashierDialog({
    super.key,
    this.preselectedOutletId,
    this.preselectedOutletName,
  });

  @override
  State<AddCashierDialog> createState() => _AddCashierDialogState();
}

class _AddCashierDialogState extends State<AddCashierDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _isSubmitting = false;
  int? _selectedRoleId;
  final Set<int> _selectedOutletIds = {};

  @override
  void initState() {
    super.initState();
    if (widget.preselectedOutletId != null) {
      _selectedOutletIds.add(widget.preselectedOutletId!);
    }

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final biz = context.read<BusinessProvider>();
      final out = context.read<OutletProvider>();

      if (biz.roles.isEmpty) {
        await biz.fetchRoles();
      }
      if (out.outlets.isEmpty) {
        await out.fetchOutlets();
      }

      // Default role to 'Cashier' or the lowest role available
      if (mounted && biz.roles.isNotEmpty && _selectedRoleId == null) {
        final cashierRole = biz.roles.firstWhere(
          (r) => (r['name'] as String).toLowerCase().contains('cashier') || (r['name'] as String).toLowerCase().contains('kasir'),
          orElse: () => biz.roles.first,
        );
        setState(() {
          _selectedRoleId = cashierRole['id'] as int;
        });
      }

      // Default outlet selection if none preselected
      if (mounted && _selectedOutletIds.isEmpty && out.outlets.isNotEmpty) {
        final activeId = out.activeOutletId ?? out.outlets.first['id'] as int;
        setState(() {
          _selectedOutletIds.add(activeId);
        });
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedOutletIds.isEmpty) {
      UiHelpers.showSnackBar(context, 'Pilih minimal satu outlet untuk kasir ini', isError: true);
      return;
    }

    if (_selectedRoleId == null) {
      UiHelpers.showSnackBar(context, 'Pilih peran (Role) untuk staf', isError: true);
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final payload = {
        'name': _nameController.text.trim(),
        'email': _emailController.text.trim().toLowerCase(),
        'phone': _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
        'password': _passwordController.text.trim().isNotEmpty ? _passwordController.text.trim() : null,
        'role_id': _selectedRoleId,
        'outlet_ids': _selectedOutletIds.toList(),
      };

      await context.read<BusinessProvider>().addMember(payload);

      if (mounted) {
        Navigator.of(context).pop(true);
        UiHelpers.showSnackBar(
          context,
          'Kasir "${_nameController.text.trim()}" berhasil ditambahkan!',
          isSuccess: true,
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        UiHelpers.showSnackBar(context, 'Gagal menambahkan kasir: $e', isError: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final outletProvider = context.watch<OutletProvider>();
    final businessProvider = context.watch<BusinessProvider>();
    final roles = businessProvider.roles;
    final outlets = outletProvider.outlets;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 0,
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 520),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: const [
            BoxShadow(
              color: Color(0x26000000),
              blurRadius: 24,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header with Gradient Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
              decoration: const BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Tambah Kasir & Staf',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.preselectedOutletName != null
                              ? 'Untuk ${widget.preselectedOutletName}'
                              : 'Tambahkan akun kasir untuk setiap outlet',
                          style: const TextStyle(fontSize: 12, color: Colors.white70),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Colors.white),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            // Form Body
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Nama Lengkap Kasir
                      const Text(
                        'Nama Lengkap Kasir *',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _nameController,
                        decoration: InputDecoration(
                          hintText: 'Contoh: Siti Rahmawati',
                          prefixIcon: const Icon(Icons.badge_outlined, size: 20),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Nama kasir wajib diisi';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Email Kasir
                      const Text(
                        'Email Login Kasir *',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: InputDecoration(
                          hintText: 'Contoh: kasir.slawi@esteh.com',
                          prefixIcon: const Icon(Icons.email_outlined, size: 20),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Email wajib diisi untuk login akun';
                          }
                          if (!val.contains('@') || !val.contains('.')) {
                            return 'Format email tidak valid';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // No HP / WhatsApp
                      const Text(
                        'Nomor HP / WhatsApp (Opsional)',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: InputDecoration(
                          hintText: 'Contoh: 081234567890',
                          prefixIcon: const Icon(Icons.phone_outlined, size: 20),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Password / PIN Login
                      const Text(
                        'Password / PIN Login *',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          hintText: 'Minimal 6 karakter / angka',
                          prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().length < 6) {
                            return 'Password minimal 6 karakter';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),

                      // Pilihan Peran (Role)
                      const Text(
                        'Peran & Hak Akses (Role) *',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      if (roles.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 4),
                          child: Text('Memuat daftar role...', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        )
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: roles.map((r) {
                            final roleId = r['id'] as int;
                            final roleName = r['name'] as String;
                            final isSelected = _selectedRoleId == roleId;
                            final isCashier = roleName.toLowerCase().contains('cashier') || roleName.toLowerCase().contains('kasir');

                            return ChoiceChip(
                              avatar: Icon(
                                isCashier ? Icons.point_of_sale_rounded : Icons.admin_panel_settings_rounded,
                                size: 16,
                                color: isSelected ? Colors.white : AppColors.primary,
                              ),
                              label: Text(roleName),
                              selected: isSelected,
                              selectedColor: AppColors.primary,
                              labelStyle: TextStyle(
                                color: isSelected ? Colors.white : AppColors.textPrimary,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                fontSize: 12,
                              ),
                              onSelected: (selected) {
                                if (selected) {
                                  setState(() => _selectedRoleId = roleId);
                                }
                              },
                            );
                          }).toList(),
                        ),
                      const SizedBox(height: 20),

                      // Penugasan Cabang / Outlet
                      const Text(
                        'Tugaskan di Cabang / Outlet *',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Kasir dapat membuka kasir di outlet yang dipilih di bawah ini:',
                        style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 8),

                      if (outlets.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 4),
                          child: Text('Memuat daftar outlet...', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        )
                      else
                        Container(
                          decoration: BoxDecoration(
                            color: AppColors.cardBackground,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.cardBorder),
                          ),
                          child: ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: outlets.length,
                            separatorBuilder: (_, __) => const Divider(height: 1),
                            itemBuilder: (ctx, idx) {
                              final o = outlets[idx];
                              final oId = o['id'] as int;
                              final oName = o['name'] as String;
                              final oCode = o['code'] as String?;
                              final isChecked = _selectedOutletIds.contains(oId);

                              return CheckboxListTile(
                                value: isChecked,
                                activeColor: AppColors.primary,
                                dense: true,
                                controlAffinity: ListTileControlAffinity.leading,
                                title: Text(
                                  oName,
                                  style: TextStyle(
                                    fontWeight: isChecked ? FontWeight.bold : FontWeight.w500,
                                    fontSize: 13,
                                  ),
                                ),
                                subtitle: oCode != null && oCode.isNotEmpty
                                    ? Text('Kode: $oCode', style: const TextStyle(fontSize: 11, color: AppColors.textTertiary))
                                    : null,
                                onChanged: (checked) {
                                  setState(() {
                                    if (checked == true) {
                                      _selectedOutletIds.add(oId);
                                    } else {
                                      if (_selectedOutletIds.length > 1) {
                                        _selectedOutletIds.remove(oId);
                                      } else {
                                        UiHelpers.showSnackBar(
                                          context,
                                          'Minimal satu outlet harus dipilih',
                                          isError: true,
                                        );
                                      }
                                    }
                                  });
                                },
                              );
                            },
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),

            // Footer Actions
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppColors.cardBorder)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Batal'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: _isSubmitting ? null : _submitForm,
                    icon: _isSubmitting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.check_rounded, size: 18),
                    label: Text(_isSubmitting ? 'Menyimpan...' : 'Simpan Kasir'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
