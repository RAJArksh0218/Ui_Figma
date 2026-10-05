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
      title: 'Pickup Location Search',
      theme: ThemeData(
        fontFamily: 'Roboto',
        scaffoldBackgroundColor: const Color(0xFFF7F7F8),
      ),
      home: const PickupLocationScreen(),
    );
  }
}

class PickupLocationScreen extends StatelessWidget {
  const PickupLocationScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Standardizing dimensions based on DesignIR bbox metadata [283 x 607]
    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F8), // ID 3 background
      body: SafeArea(
        child: Stack(
          children: [
            // Main content area representing ID 1 & 0 structured hierarchies
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Search & Header Bar (ID 1 contents mapped to header)
                Container(
                  padding: const EdgeInsets.fromLTRB(16.0, 12.0, 16.0, 16.0),
                  decoration: const BoxDecoration(
                    color: Color(0xFFF5F5F6), // ID 1 hex_color
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(16),
                      bottomRight: Radius.circular(16),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Status Bar representation (9:41)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: const [
                          Text(
                            "9:41",
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: Colors.black87,
                            ),
                          ),
                          Icon(Icons.battery_full, size: 16),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Back Button and Title
                      Row(
                        children: [
                          const Icon(Icons.arrow_back, color: Colors.black87),
                          const SizedBox(width: 12),
                          const Text(
                            "Pickup Location",
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Search Input field
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            )
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.search, color: Colors.grey),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Text(
                                "Search for location",
                                style: TextStyle(color: Colors.grey, fontSize: 14),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Current Location shortcut
                      Row(
                        children: const [
                          Icon(Icons.my_location, size: 18, color: Colors.blue),
                          SizedBox(width: 8),
                          Text(
                            "Current Location",
                            style: TextStyle(
                              color: Colors.blue,
                              fontWeight: FontWeight.w500,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Recent Searches Label & List Items
                Padding(
                  padding: const EdgeInsets.fromLTRB(16.0, 20.0, 16.0, 8.0),
                  child: Text(
                    "RECENT SEARCHES",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[600],
                      letterSpacing: 0.8,
                    ),
                  ),
                ),

                // Scrollable Recent Searches List representing components hierarchy (ID 4, 5, 6 icons & ID 7-11 accents)
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    children: [
                      // Item 1 (corresponds to ID 4 container & surrounding metadata)
                      _buildRecentSearchItem(
                        iconColor: const Color(0xFFE8EAEC), // ID 4
                        title: "Secunderabad",
                        subtitle: "Tech Mahindra Office",
                        badgeColor: const Color(0xFFE0E1E5), // ID 8
                        badgeWidth: 21,
                      ),
                      const Divider(height: 1, color: Color(0xFFE8EAEC)),

                      // Item 2 (corresponds to ID 5 container & surrounding metadata)
                      _buildRecentSearchItem(
                        iconColor: const Color(0xFFE8EAEC), // ID 5
                        title: "Sth Block Road No 14",
                        subtitle: "Hyderabad",
                        badgeColor: const Color(0xFFE4E5E8), // ID 11
                        badgeWidth: 26,
                      ),
                      const Divider(height: 1, color: Color(0xFFE8EAEC)),

                      // Item 3 (corresponds to ID 6 container & surrounding metadata)
                      _buildRecentSearchItem(
                        iconColor: const Color(0xFFE8EAEC), // ID 6
                        title: "Kukatpally Main Junction",
                        subtitle: "Block 7, Kukatpally, Hyd",
                        badgeColor: const Color(0xFFE1E3E6), // ID 7
                        badgeWidth: 36,
                      ),
                      
                      const SizedBox(height: 20),
                      
                      // Secondary helper text block (ID 0 / ID 9 visual contents)
                      Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Text(
                          "Loculc Cn location 22 km 2.6 KI 20 FTI 47/731/A plocx 7, Kukatpally Main Jinction Hy 4k rydclabud Bekm Hop Pinjo",
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey[400],
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Gap to avoid bottom bar overlap
                const SizedBox(height: 85),
              ],
            ),

            // Bottom Nav/Action Container (ID 2 container: top 529, height 75)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              height: 75,
              child: Container(
                color: const Color(0xFFFEFEFE), // ID 2 background
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 10,
                    offset: const Offset(0, -2),
                  )
                ],
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.map_outlined, color: Colors.black87),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Text(
                              "Set location on map",
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                color: Colors.black87,
                              ),
                            ),
                            Text(
                              "Drag and pin location",
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.black87,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      ),
                      onPressed: () {},
                      child: const Text(
                        "Confirm",
                        style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
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

  Widget _buildRecentSearchItem({
    required Color iconColor,
    required String title,
    required String subtitle,
    required Color badgeColor,
    required double badgeWidth,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon Placeholder representation (IDs 4, 5, 6)
          Container(
            width: 27,
            height: 27,
            decoration: BoxDecoration(
              color: iconColor,
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Icon(Icons.history, size: 16, color: Colors.black54),
          ),
          const SizedBox(width: 12),
          // Text Content representation
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Colors.black87,
                      ),
                    ),
                    // Small decorative accent line representing ID 8, 11, 7 etc.
                    Container(
                      width: badgeWidth,
                      height: 5,
                      decoration: BoxDecoration(
                        color: badgeColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}