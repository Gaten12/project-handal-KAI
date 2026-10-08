const fs = require('fs');
const path = '../SiparkaApp/lib/screens/inspeksi_gerbong_screen.dart';
let content = fs.readFileSync(path, 'utf8');

const appendStr = `
class _BottomSheetCctvForm extends StatefulWidget {
  final InspeksiItem itemBerfungsi;
  final InspeksiItem itemTerbackup;
  final String itemName;
  final VoidCallback onSave;

  const _BottomSheetCctvForm({
    required this.itemBerfungsi,
    required this.itemTerbackup,
    required this.itemName,
    required this.onSave,
  });

  @override
  State<_BottomSheetCctvForm> createState() => _BottomSheetCctvFormState();
}

class _BottomSheetCctvFormState extends State<_BottomSheetCctvForm> {
  String _statusBerfungsi = 'AWAL';
  String _statusTerbackup = 'AWAL';
  final TextEditingController _descBerfungsiController = TextEditingController();
  final TextEditingController _descTerbackupController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _statusBerfungsi = widget.itemBerfungsi.status;
    _statusTerbackup = widget.itemTerbackup.status;
    _descBerfungsiController.text = widget.itemBerfungsi.deskripsiKerusakan ?? '';
    _descTerbackupController.text = widget.itemTerbackup.deskripsiKerusakan ?? '';
  }

  @override
  void dispose() {
    _descBerfungsiController.dispose();
    _descTerbackupController.dispose();
    super.dispose();
  }

  void _save() {
    widget.itemBerfungsi.status = _statusBerfungsi;
    widget.itemBerfungsi.deskripsiKerusakan =
        _statusBerfungsi == 'RUSAK' ? _descBerfungsiController.text : null;
        
    widget.itemTerbackup.status = _statusTerbackup;
    widget.itemTerbackup.deskripsiKerusakan =
        _statusTerbackup == 'RUSAK' ? _descTerbackupController.text : null;

    widget.onSave();
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: AplikasiTheme.cardWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 50,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Inspeksi \${widget.itemName}',
              style: AplikasiTheme.headingMedium,
            ),
            const SizedBox(height: 24),
            
            // Berfungsi Section
            Text('Kondisi Kamera (Berfungsi)', style: AplikasiTheme.headingSmall),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildStatusOption(true, 'BAIK', AplikasiTheme.statusBaik)),
                const SizedBox(width: 8),
                Expanded(child: _buildStatusOption(true, 'TIADA', Colors.grey)),
                const SizedBox(width: 8),
                Expanded(child: _buildStatusOption(true, 'RUSAK', AplikasiTheme.statusRusak)),
              ],
            ),
            if (_statusBerfungsi == 'RUSAK') ...[
              const SizedBox(height: 12),
              TextField(
                controller: _descBerfungsiController,
                maxLines: 1,
                decoration: AplikasiTheme.inputFieldDecoration('Deskripsi kerusakan kamera...'),
              ),
            ],
            
            const SizedBox(height: 24),
            
            // Terbackup Section
            Text('Kondisi Memory (Terbackup)', style: AplikasiTheme.headingSmall),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildStatusOption(false, 'BAIK', AplikasiTheme.statusBaik)),
                const SizedBox(width: 8),
                Expanded(child: _buildStatusOption(false, 'TIADA', Colors.grey)),
                const SizedBox(width: 8),
                Expanded(child: _buildStatusOption(false, 'RUSAK', AplikasiTheme.statusRusak)),
              ],
            ),
            if (_statusTerbackup == 'RUSAK') ...[
              const SizedBox(height: 12),
              TextField(
                controller: _descTerbackupController,
                maxLines: 1,
                decoration: AplikasiTheme.inputFieldDecoration('Deskripsi kerusakan memory...'),
              ),
            ],
            
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AplikasiTheme.primaryBlue,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                child: Text('Simpan',
                    style: AplikasiTheme.buttonText.copyWith(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusOption(bool isBerfungsi, String title, Color color) {
    final currentStatus = isBerfungsi ? _statusBerfungsi : _statusTerbackup;
    final isSelected = currentStatus == title;
    return GestureDetector(
      onTap: () {
        setState(() {
          if (isBerfungsi) {
            _statusBerfungsi = title;
          } else {
            _statusTerbackup = title;
          }
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : AplikasiTheme.surfaceGrey,
          border: Border.all(
            color: isSelected ? color : Colors.transparent,
            width: 2,
          ),
          borderRadius: BorderRadius.circular(15),
        ),
        alignment: Alignment.center,
        child: Text(
          title,
          style: AplikasiTheme.bodyLarge.copyWith(
            color: isSelected ? color : AplikasiTheme.textLight,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
`;

fs.writeFileSync(path, content + appendStr, 'utf8');
console.log('Appended successfully');
