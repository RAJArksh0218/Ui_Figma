import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Map Navigation UI',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        fontFamily: 'Roboto',
      ),
      home: const MapNavigationScreen(),
    );
  }
}

class MapNavigationScreen extends StatelessWidget {
  const MapNavigationScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Proportional dimensions matching the DesignIR aspect ratios
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 600;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F8), // hex_color: #f7f7f8
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            // Root Component Map Layer (ID: 0 & Background)
            const Positioned.fill(
              child: MapBackgroundWidget(),
            ),

            // Left/Top Panel Content (ID: 13 panel container & search flows)
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: isDesktop ? 400 : size.width * 0.92,
              child: Container(
                margin: const EdgeInsets.all(12.0),
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F6F7), // hex_color: #f5f6f7
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 15,
                      offset: const Offset(0, 5),
                    )
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Top Status / Title Area
                    Padding(
                      padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 8.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "9:41",
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: Colors.black87,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, py: 4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              "Destination",
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Colors.blueAccent,
                              ),
                            ),
                          )
                        ],
                      ),
                    ),

                    // Destination Inputs (ID: 1 Card container)
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                      padding: const EdgeInsets.all(12.0),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F2F5), // hex_color: #f1f2f5
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Colors.blueAccent,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Text(
                                  "Current Location",
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.black54,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4.0),
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: Container(
                                margin: const EdgeInsets.only(left: 3),
                                width: 2,
                                height: 16,
                                color: Colors.grey.shade400,
                              ),
                            ),
                          ),
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Colors.redAccent,
                                  shape: BoxShape.rectangle,
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: TextField(
                                  decoration: InputDecoration(
                                    hintText: "Enter destination",
                                    hintStyle: TextStyle(
                                      fontSize: 14,
                                      color: Colors.black38,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    border: InputBorder.none,
                                    isDense: true,
                                    contentPadding: EdgeInsets.zero,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Navigation Actions Scroll Bar (ID: 4, 14, 16, 5 chips area)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 12.0),
                        child: Row(
                          children: [
                            // ID: 4 chip
                            _buildQuickChip(
                              iconColor: const Color(0xFFE1EAF9),
                              label: "Use Current Location",
                              textColor: const Color(0xFF4A69FF),
                            ),
                            const SizedBox(width: 8),
                            // ID: 14 representation
                            _buildQuickChip(
                              iconColor: const Color(0xFFBEBFC0),
                              label: "Locate on Map",
                              textColor: Colors.black87,
                            ),
                            const SizedBox(width: 8),
                            // ID: 16 representation
                            _buildQuickChip(
                              iconColor: const Color(0xFFC1C1C2),
                              label: "Recent",
                              textColor: Colors.black87,
                            ),
                            const SizedBox(width: 8),
                            // ID: 5 chip
                            _buildQuickChip(
                              iconColor: const Color(0xFFDFE9F9),
                              label: "Saved Address",
                              textColor: const Color(0xFF4A69FF),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                      child: Text(
                        "RECENT SEARCHES",
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Colors.black38,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),

                    // List of Locations (Home, Work, Friends Matching IDs 6,7,8,9,10,11,12,15,17)
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.symmetric(horizontal: 12.0),
                        children: [
                          // Row 1: Home (ID: 7, 9, 11)
                          _buildLocationItem(
                            iconBgColor: const Color(0xFFEBEDEF),
                            icon: Icons.home_rounded,
                            iconColor: const Color(0xFFB9B9BB),
                            title: "Home",
                            subtitle: "Block 7, Kukatpally, Hyderabad",
                            rightText: "4.1 Km",
                          ),
                          const Divider(height: 1, indent: 50),
                          // Row 2: Work (ID: 8, 12, 10)
                          _buildLocationItem(
                            iconBgColor: const Color(0xFFEAECEE),
                            icon: Icons.work_rounded,
                            iconColor: const Color(0xFFB8B9BA),
                            title: "Work",
                            subtitle: "Tech Mahindra Office, Kukatpally Main Junction",
                            rightText: "BSkT",
                          ),
                          const Divider(height: 1, indent: 50),
                          // Row 3: Friends (ID: 6, 17, 15)
                          _buildLocationItem(
                            iconBgColor: const Color(0xFFECEDEF),
                            icon: Icons.people_alt_rounded,
                            iconColor: const Color(0xFFBEBFC0),
                            title: "Friends",
                            subtitle: "Door No 47/331/A, HCU Road No 14, Secunderabad",
                            rightText: "2.2 Km",
                          ),
                        ],
                      ),
                    ),

                    // Bottom navigation container (ID: 2 inside ID: 3 root)
                    Container(
                      margin: const EdgeInsets.all(12.0),
                      height: 50,
                      decoration: BoxDecoration(
                        color: Colors.white, // hex_color: #ffffff
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 6,
                            offset: const Offset(0, -2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.explore_outlined, color: Colors.blueAccent),
                            onPressed: () {},
                          ),
                          IconButton(
                            icon: const Icon(Icons.star_outline_rounded, color: Colors.black45),
                            onPressed: () {},
                          ),
                          IconButton(
                            icon: const Icon(Icons.history_rounded, color: Colors.black45),
                            onPressed: () {},
                          ),
                          IconButton(
                            icon: const Icon(Icons.person_outline_rounded, color: Colors.black45),
                            onPressed: () {},
                          ),
                        ],
                      ),
                    )
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickChip({
    required Color iconColor,
    required String label,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: iconColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: textColor.withOpacity(0.6),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationItem({
    required Color iconBgColor,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required String rightText,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0, horizontal: 4.0),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconBgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 18,
              color: iconColor,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Colors.black45,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F2F5),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              rightText,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Simulated dynamic map art element (ID: 0)
class MapBackgroundWidget extends StatelessWidget {
  const MapBackgroundWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF7F7F8),
      child: CustomPaint(
        painter: MapPainter(),
      ),
    );
  }
}

class MapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paintLine = Paint()
      ..color = Colors.white
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round;

    final paintLineBorder = Paint()
      ..color = const Color(0xFFE4E6EB)
      ..strokeWidth = 18
      ..strokeCap = StrokeCap.round;

    // Drawing some abstract roads for map representation
    _drawRoad(canvas, Offset(0, size.height * 0.2), Offset(size.width, size.height * 0.4), paintLineBorder, paintLine);
    _drawRoad(canvas, Offset(size.width * 0.4, 0), Offset(size.width * 0.6, size.height), paintLineBorder, paintLine);
    _drawRoad(canvas, Offset(0, size.height * 0.75), Offset(size.width, size.height * 0.65), paintLineBorder, paintLine);

    // Green areas
    final greenPaint = Paint()..color = const Color(0xFFE8F5E9);
    canvas.drawRect(Rect.fromLTWH(size.width * 0.65, size.height * 0.1, 100, 120), greenPaint);
    canvas.drawRect(Rect.fromLTWH(size.width * 0.1, size.height * 0.78, 120, 80), greenPaint);

    // Draw Pin
    final pinPaint = Paint()..color = const Color(0xFFFF5252);
    canvas.drawCircle(Offset(size.width * 0.7, size.height * 0.4), 8, pinPaint);
  }

  void _drawRoad(Canvas canvas, Offset start, Offset end, Paint border, Paint fill) {
    canvas.drawLine(start, end, border);
    canvas.drawLine(start, end, fill);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}