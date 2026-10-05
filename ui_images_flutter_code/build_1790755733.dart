import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : sender;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Location Picker',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        fontFamily: 'Roboto',
      ),
      home: const LocationPickerScreen(),
    );
  }
}

class LocationPickerScreen extends StatelessWidget {
  const LocationPickerScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Design coordinates are based on 276 x 605 layout
    const double designWidth = 276.0;
    const double designHeight = 605.0;

    return Scaffold(
      backgroundColor: const Color(0xFFDDE2E7),
      body: SafeArea(
        child: Center(
          child: AspectRatio(
            aspectRatio: designWidth / designHeight,
            child: LayoutBuilder(
              builder: (context, constraints) {
                final double scaleX = constraints.maxWidth / designWidth;
                final double scaleY = constraints.maxHeight / designHeight;

                // Helper function to scale coordinates
                double x(double val) => val * scaleX;
                double y(double val) => val * scaleY;
                double w(double val) => val * scaleX;
                double h(double val) => val * scaleY;

                return Stack(
                  children: [
                    // --- MAP BACKGROUND LAYERS ---
                    // Base Map Layer 1 (id: 1)
                    Positioned(
                      left: x(0),
                      top: y(0),
                      width: w(275),
                      height: h(603),
                      child: Container(
                        color: const Color(0xFFDDE2E7),
                      ),
                    ),
                    // Base Map Layer 2 (id: 2)
                    Positioned(
                      left: x(0),
                      top: y(0),
                      width: w(161),
                      height: h(603),
                      child: Container(
                        color: const Color(0xFFDAE1E7),
                      ),
                    ),
                    // Base Map Layer 3 - Custom abstract road path (id: 4)
                    Positioned(
                      left: x(81),
                      top: y(126),
                      width: w(160),
                      height: h(368),
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFE4E4DC),
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    // Abstract Map Road Segment (id: 6)
                    Positioned(
                      left: x(1),
                      top: y(126),
                      width: w(81),
                      height: h(15),
                      child: Container(
                        color: const Color(0xFFEAEBEE),
                      ),
                    ),

                    // --- MAP PIN / INDICATOR (id: 8) ---
                    Positioned(
                      left: x(40),
                      top: y(245),
                      width: w(102),
                      height: h(119),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, py: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFCCE0D4),
                                borderRadius: BorderRadius.circular(8),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.1),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: const Text(
                                "Meet here",
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF2E5B3D),
                                ),
                              ),
                            ),
                            const Icon(
                              Icons.location_on,
                              size: 32,
                              color: Color(0xFF1655BA),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // --- HEADER / SEARCH BAR (id: 5) ---
                    Positioned(
                      left: x(1),
                      top: y(0),
                      width: w(272),
                      height: h(122),
                      child: Container(
                        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF6F7F8),
                          borderRadius: const BorderRadius.vertical(
                            bottom: Radius.circular(16),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.08),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.arrow_back, size: 20, color: Colors.black85),
                                const SizedBox(width: 8),
                                const Text(
                                  "Set Pickup Location",
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black85,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.grey.shade300),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.search, size: 16, color: Colors.grey),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      "Search location...",
                                      style: TextStyle(
                                        color: Colors.grey.shade600,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // --- BOTTOM PANEL / SELECTED LOCATION (id: 3) ---
                    Positioned(
                      left: x(1),
                      top: y(455), // Adjusted slightly to fit content beautifully
                      width: w(272),
                      height: h(148),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(20),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.12),
                              blurRadius: 10,
                              offset: const Offset(0, -3),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Marker Icon container (id: 9)
                                Container(
                                  width: w(24),
                                  height: h(24),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE1EAF9),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Icon(
                                    Icons.location_pin,
                                    size: 14,
                                    color: Color(0xFF1655BA),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        "SELECTED LOCATION",
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF1655BA),
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      const Text(
                                        "47/333/A Block 7, Kukatpally: Main Junction Hyderabad",
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.black85,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const Spacer(),
                            // Confirm Location Button (id: 0)
                            SizedBox(
                              width: double.infinity,
                              height: h(36),
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF1655BA),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  elevation: 0,
                                ),
                                onPressed: () {
                                  // Action handler
                                },
                                child: const Text(
                                  "Confirm Location",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}