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
      title: 'Pickup Location',
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFFF7F7F8),
        fontFamily: 'Roboto',
      ),
      home: const PickupLocationScreen(),
    );
  }
}

class PickupLocationScreen extends StatelessWidget {
  const PickupLocationScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Using layout constraints dynamically to adapt to different devices
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Custom Header & Search Input Area
                Container(
                  padding: const EdgeInsets.fromLTRB(16.0, 12.0, 16.0, 20.0),
                  decoration: const BoxDecoration(
                    color: Color(0xFFF5F5F6),
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(24),
                      bottomRight: Radius.circular(24),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Status Area Row
                      Row(
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
                          Row(
                            children: const [
                              Icon(Icons.signal_cellular_4_bar, size: 16, color: Colors.black87),
                              SizedBox(width: 4),
                              Icon(Icons.wifi, size: 16, color: Colors.black87),
                              SizedBox(width: 4),
                              Icon(Icons.battery_full, size: 16, color: Colors.black87),
                            ],
                          )
                        ],
                      ),
                      const SizedBox(height: 20),
                      // Title
                      const Text(
                        "Pickup Location",
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E2022),
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Search Field
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const TextField(
                          decoration: InputDecoration(
                            hintText: "Search for location...",
                            hintStyle: TextStyle(color: Colors.grey),
                            prefixIcon: Icon(Icons.search, color: Colors.grey),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Current Location Row
                      Row(
                        children: const [
                          Icon(Icons.my_location, color: Colors.blueAccent, size: 18),
                          SizedBox(width: 8),
                          Text(
                            "Use Current Location",
                            style: TextStyle(
                              color: Colors.blueAccent,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Recent Searches Label
                const Padding(
                  padding: EdgeInsets.fromLTRB(16.0, 24.0, 16.0, 12.0),
                  child: Text(
                    "RECENT SEARCHES",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                      color: Color(0xFF8E9093),
                    ),
                  ),
                ),

                // List of Recent Locations (Reflecting IDs 4, 5, 6 with matched elements)
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    children: [
                      _buildLocationItem(
                        iconColor: const Color(0xFFE8EAEC),
                        title: "Tech Mahendra Office",
                        subtitle: "Block 7, Kukatpally Main Junction, Hyd",
                        distance: "2.6 km",
                      ),
                      _buildLocationItem(
                        iconColor: const Color(0xFFE8EAEC),
                        title: "Pista House",
                        subtitle: "Door No 5, Near Metro Pillar 47",
                        distance: "4.2 km",
                      ),
                      _buildLocationItem(
                        iconColor: const Color(0xFFE8EAEC),
                        title: "Home (5th Block)",
                        subtitle: "Road No 14, Secunderabad",
                        distance: "12 km",
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Bottom Navigation/Action Bar (Reflecting Container ID 2)
            Align(
              alignment: Alignment.bottomCenter,
              child: Container(
                height: 75,
                margin: const EdgeInsets.all(16.0),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEFEFE),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 20,
                      offset: const Offset(0, -4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0F2F5),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.home, color: Colors.blueAccent),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              "Saved Address",
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: Color(0xFF1E2022),
                              ),
                            ),
                            Text(
                              "Go to home easily",
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                      onPressed: () {},
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

  Widget _buildLocationItem({
    required Color iconColor,
    required String title,
    required String subtitle,
    required String distance,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Left Icon Container (ID 4, 5, 6 equivalent)
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconColor,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.location_on,
                color: Color(0xFF7F8C8D),
                size: 20,
              ),
            ),
            const SizedBox(width: 16),
            // Middle Text Elements
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children:
 [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: Color(0xFF2C3E50),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF7F8C8D),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Right Distance label
            Text(
              distance,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.blueAccent,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}