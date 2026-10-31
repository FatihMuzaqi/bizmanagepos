import 'package:intl/intl.dart';

class DateFormatter {
  static const List<String> _monthsIndo = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  static String formatDateTime(dynamic date) {
    if (date == null) return '-';
    DateTime? dt;
    if (date is DateTime) {
      dt = date;
    } else if (date is String) {
      dt = DateTime.tryParse(date);
    }
    if (dt == null) return '-';
    
    final local = dt.toLocal();
    try {
      return DateFormat('dd MMM yyyy, HH:mm').format(local);
    } catch (_) {
      final monthName = (local.month >= 1 && local.month <= 12)
          ? _monthsIndo[local.month - 1]
          : '${local.month}';
      final day = local.day.toString().padLeft(2, '0');
      final hour = local.hour.toString().padLeft(2, '0');
      final minute = local.minute.toString().padLeft(2, '0');
      return '$day $monthName ${local.year}, $hour:$minute';
    }
  }

  static String formatDate(dynamic date) {
    if (date == null) return '-';
    DateTime? dt;
    if (date is DateTime) {
      dt = date;
    } else if (date is String) {
      dt = DateTime.tryParse(date);
    }
    if (dt == null) return '-';

    final local = dt.toLocal();
    try {
      return DateFormat('dd MMM yyyy').format(local);
    } catch (_) {
      final monthName = (local.month >= 1 && local.month <= 12)
          ? _monthsIndo[local.month - 1]
          : '${local.month}';
      final day = local.day.toString().padLeft(2, '0');
      return '$day $monthName ${local.year}';
    }
  }

  static String formatTime(dynamic date) {
    if (date == null) return '-';
    DateTime? dt;
    if (date is DateTime) {
      dt = date;
    } else if (date is String) {
      dt = DateTime.tryParse(date);
    }
    if (dt == null) return '-';

    final local = dt.toLocal();
    try {
      return DateFormat('HH:mm').format(local);
    } catch (_) {
      final hour = local.hour.toString().padLeft(2, '0');
      final minute = local.minute.toString().padLeft(2, '0');
      return '$hour:$minute';
    }
  }
}
