import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../constants/app_colors.dart';

class UiHelpers {
  /// Format error objects (ApiException, Exception, String, etc.) into clean human-readable Indonesian text
  static String formatErrorMessage(dynamic error) {
    if (error == null) return 'Terjadi kesalahan sistem.';

    String raw = '';
    if (error is ApiException) {
      if (error.errors != null) {
        if (error.errors is List && (error.errors as List).isNotEmpty) {
          raw = (error.errors as List).map((e) => e.toString()).join('\n');
        } else if (error.errors is String) {
          raw = error.errors as String;
        } else {
          raw = error.message;
        }
      } else {
        raw = error.message;
      }
    } else {
      raw = error.toString().trim();
    }

    // Clean Exception prefixes
    if (raw.startsWith('Exception: ')) {
      raw = raw.substring('Exception: '.length).trim();
    }
    if (raw.startsWith('ApiException: ')) {
      raw = raw.substring('ApiException: '.length).trim();
    }

    // Translate network/server connection issues
    if (raw.contains('Failed host lookup') ||
        raw.contains('Connection refused') ||
        raw.contains('SocketException')) {
      return 'Gagal terhubung ke server. Periksa koneksi internet Anda atau pastikan backend aktif.';
    }
    if (raw.contains('TimeoutException') || raw.contains('timed out')) {
      return 'Koneksi ke server timeout (waktu habis). Silakan coba sesaat lagi.';
    }

    // Clean Validation error prefix
    if (raw.startsWith('Validation error:')) {
      raw = raw.replaceFirst('Validation error:', '').trim();
    }

    // Humanize common validator phrases
    if (raw.contains('"name" is required') || raw.contains('Name is required')) {
      return 'Nama data wajib diisi.';
    }
    if (raw.contains('must be greater than 0') || raw.contains('must be greater than or equal to 0')) {
      return 'Nilai angka harus lebih dari 0.';
    }
    if (raw.contains('is not allowed')) {
      return 'Format data tidak sesuai.';
    }

    // Strip remaining field quotes
    raw = raw.replaceAll('"', '');

    if (raw.isEmpty) {
      return 'Terjadi kesalahan yang tidak diketahui.';
    }

    return raw;
  }

  /// Modern floating notification alert (SnackBar) with colored icon badge, bold title, and dismiss button
  static void showSnackBar(
    BuildContext context,
    String message, {
    String? title,
    bool isError = false,
    bool isSuccess = false,
    bool isWarning = false,
    Duration duration = const Duration(seconds: 4),
  }) {
    final statusColor = isError
        ? AppColors.error
        : isSuccess
            ? AppColors.success
            : isWarning
                ? AppColors.warning
                : AppColors.primary;

    final statusIcon = isError
        ? Icons.cancel_rounded
        : isSuccess
            ? Icons.check_circle_rounded
            : isWarning
                ? Icons.warning_amber_rounded
                : Icons.info_outline_rounded;

    final displayTitle = title ??
        (isError
            ? 'Gagal!'
            : isSuccess
                ? 'Berhasil!'
                : isWarning
                    ? 'Perhatian!'
                    : null);

    final displayMessage = isError ? formatErrorMessage(message) : message;

    try {
      final messenger = ScaffoldMessenger.of(context);
      messenger.hideCurrentSnackBar();
      messenger.showSnackBar(
        SnackBar(
          elevation: 0,
          backgroundColor: Colors.transparent,
          behavior: SnackBarBehavior.floating,
          padding: EdgeInsets.zero,
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          duration: duration,
          content: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B), // Modern Slate-800 background
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: statusColor.withValues(alpha: 0.4),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.25),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Visual Icon Badge
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.18),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(statusIcon, color: statusColor, size: 22),
                ),
                const SizedBox(width: 12),
                // Alert Title & Message
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (displayTitle != null && displayTitle.isNotEmpty) ...[
                        Text(
                          displayTitle,
                          style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.w700,
                            fontSize: 13.5,
                            letterSpacing: 0.2,
                          ),
                        ),
                        const SizedBox(height: 2),
                      ],
                      Text(
                        displayMessage,
                        style: const TextStyle(
                          color: Color(0xFFF1F5F9), // Slate 100
                          fontWeight: FontWeight.w400,
                          fontSize: 12.5,
                          height: 1.3,
                        ),
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Close / Dismiss Button
                InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () {
                    messenger.hideCurrentSnackBar();
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      Icons.close_rounded,
                      size: 18,
                      color: Colors.white.withValues(alpha: 0.6),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    } catch (e) {
      debugPrint('UiHelpers.showSnackBar exception: $e');
    }
  }

  /// Explicit shortcut to show a Success alert notification
  static void showSuccess(
    BuildContext context,
    String message, {
    String title = 'Berhasil!',
    Duration duration = const Duration(seconds: 4),
  }) {
    showSnackBar(
      context,
      message,
      title: title,
      isSuccess: true,
      duration: duration,
    );
  }

  /// Explicit shortcut to show an Error alert notification
  static void showError(
    BuildContext context,
    dynamic errorOrMessage, {
    String title = 'Gagal!',
    Duration duration = const Duration(seconds: 5),
  }) {
    showSnackBar(
      context,
      formatErrorMessage(errorOrMessage),
      title: title,
      isError: true,
      duration: duration,
    );
  }

  /// Explicit shortcut to show a Warning alert notification
  static void showWarning(
    BuildContext context,
    String message, {
    String title = 'Perhatian!',
    Duration duration = const Duration(seconds: 4),
  }) {
    showSnackBar(
      context,
      message,
      title: title,
      isWarning: true,
      duration: duration,
    );
  }

  /// Explicit shortcut to show an Informational alert notification
  static void showInfo(
    BuildContext context,
    String message, {
    String title = 'Informasi',
    Duration duration = const Duration(seconds: 4),
  }) {
    showSnackBar(
      context,
      message,
      title: title,
      duration: duration,
    );
  }

  /// Standard permission denied alert
  static void showPermissionDenied(BuildContext context) {
    showError(
      context,
      'Anda tidak memiliki izin (hak akses) untuk melakukan tindakan ini.',
      title: 'Akses Ditolak',
    );
  }

  /// Modal dialog alert for high-priority success/error/warning confirmation
  static Future<void> showAlertDialog(
    BuildContext context, {
    required String title,
    required String message,
    bool isError = false,
    bool isSuccess = false,
    bool isWarning = false,
    String buttonText = 'Tutup',
    VoidCallback? onConfirm,
  }) {
    final statusColor = isError
        ? AppColors.error
        : isSuccess
            ? AppColors.success
            : isWarning
                ? AppColors.warning
                : AppColors.primary;

    final icon = isError
        ? Icons.cancel_rounded
        : isSuccess
            ? Icons.check_circle_rounded
            : isWarning
                ? Icons.warning_amber_rounded
                : Icons.info_outline_rounded;

    return showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        contentPadding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: statusColor, size: 32),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              formatErrorMessage(message),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700, height: 1.4),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: statusColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onPressed: () {
                Navigator.of(ctx).pop();
                if (onConfirm != null) onConfirm();
              },
              child: Text(buttonText, style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  /// Success modal dialog shortcut
  static Future<void> showSuccessDialog(
    BuildContext context, {
    required String title,
    required String message,
    String buttonText = 'Selesai',
    VoidCallback? onConfirm,
  }) {
    return showAlertDialog(
      context,
      title: title,
      message: message,
      isSuccess: true,
      buttonText: buttonText,
      onConfirm: onConfirm,
    );
  }

  /// Error modal dialog shortcut
  static Future<void> showErrorDialog(
    BuildContext context, {
    required String title,
    required dynamic error,
    String buttonText = 'Mengerti',
    VoidCallback? onConfirm,
  }) {
    return showAlertDialog(
      context,
      title: title,
      message: formatErrorMessage(error),
      isError: true,
      buttonText: buttonText,
      onConfirm: onConfirm,
    );
  }

  /// Modern confirmation dialog
  static Future<bool?> showConfirmDialog(
    BuildContext context, {
    required String title,
    required String content,
    String confirmLabel = 'Ya, Lanjutkan',
    String cancelLabel = 'Batal',
    bool isDestructive = false,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
        titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isDestructive ? AppColors.errorContainer : AppColors.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                isDestructive ? Icons.warning_amber_rounded : Icons.help_outline_rounded,
                color: isDestructive ? AppColors.error : AppColors.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
              ),
            ),
          ],
        ),
        content: Text(
          content,
          style: TextStyle(color: Colors.grey.shade700, fontSize: 14, height: 1.4),
        ),
        actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            child: Text(cancelLabel, style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: isDestructive ? AppColors.error : AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
  }
}
