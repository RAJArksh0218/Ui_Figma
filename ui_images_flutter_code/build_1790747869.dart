import 'package:flutter/material.dart';

void main() {
  runApp(const FirstKutAIApp());
}

class FirstKutAIApp extends StatelessWidget {
  const FirstKutAIApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FirstKutAI Pipeline Integration',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF1C1A21),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF96807C),
          secondary: Color(0xFF7A5450),
          background: Color(0xFF1C1A21),
          surface: Color(0xFF14151C),
        ),
      ),
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Component 4: Top Browser / Title Bar
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: const Color(0xFF482D2A),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: const BoxDecoration(
                              color: Colors.redAccent,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            width: 12,
                            height: 12,
                            decoration: const BoxDecoration(
                              color: Colors.amberAccent,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            width: 12,
                            height: 12,
                            decoration: const BoxDecoration(
                              color: Colors.greenAccent,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 16),
                          const Text(
                            "Google AI Studio - Unified Code Generation Studio",
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      // Component 11: Settings Link
                      TextButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.settings, size: 14, color: Color(0xFF7A5450)),
                        label: const Text(
                          "go to Settings",
                          style: TextStyle(
                            color: Color(0xFF7A5450),
                            fontSize: 12,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Ask Gemini | localhost:5173 | Continue where you left off",
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.white.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
            ),

            // Main Dashboard Body
            Expanded(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Left Sidebar Area (Controls & Uploads)
                  Expanded(
                    flex: 3,
                    child: Container(
                      color: const Color(0xFF14151C),
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Component 10: Control Panel Header
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF34384B),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              "SOURCE UI CONTROL PANEL",
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.2,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          
                          // Component 3: Drag & Drop upload section
                          Expanded(
                            child: Container(
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: const Color(0xFF1C1A21),
                                border: Border.all(color: const Color(0xFF34384B), width: 1.5),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(
                                    Icons.cloud_upload_outlined,
                                    size: 48,
                                    color: Color(0xFF96807C),
                                  ),
                                  const SizedBox(height: 16),
                                  const Text(
                                    "Click to Upload UI Screenshot",
                                    textAlign: Center,
                                    style: TextStyle(
                                      color: Colors.white70,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    "Supports PNG, JPG up to 10MB",
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.4),
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Center Content Area (Workspace and Logs)
                  Expanded(
                    flex: 7,
                    child: Container(
                      color: const Color(0xFF1C1A21),
                      child: Column(
                        children: [
                          // Component 1: Telemetry & Log header
                          Container(
                            padding: const EdgeInsets.all(16),
                            width: double.infinity,
                            color: const Color(0xFF2D2328),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      "UI Image Parser Workspace API",
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                    ),
                                    // Component 6: Status Indicator
                                    Container(
                                      width: 26,
                                      height: 22,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF96807C),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Icon(
                                        Icons.bolt,
                                        size: 14,
                                        color: Colors.black,
                                      ),
                                    )
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  "SYSTEM LOGS | PIPELINE LIVE TELEMETRY STREAM | Dart Code Copy Ready",
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.6),
                                    fontSize: 11,
                                    fontFamily: 'Courier',
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Tab Selection Bar (Components 2, 8, 9)
                          Container(
                            color: const Color(0xFF14151C),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: Row(
                              children: [
                                _buildTab("SAM Segmentation", const Color(0xFF2F3345), true),
                                const SizedBox(width: 8),
                                _buildTab("Colors", const Color(0xFF303547), false),
                                const SizedBox(width: 8),
                                _buildTab("Flutter Output", const Color(0xFF1B151A), false),
                              ],
                            ),
                          ),

                          // Central Canvas Area (Component 5)
                          Expanded(
                            child: Container(
                              margin: const EdgeInsets.all(16),
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: const Color(0xFF090A0F),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  const Icon(
                                    Icons.error_outline_rounded,
                                    color: Colors.redAccent,
                                    size: 48,
                                  ),
                                  const SizedBox(height: 16),
                                  const Text(
                                    "Code synthesis failed",
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    "All model tiers returned an error. Please verify your GEMINI API KEY and your internet connection parameters.",
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: Colors.white70,
                                      fontSize: 13,
                                      height: 1.4,
                                    ),
                                  ),
                                  const SizedBox(height: 24),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF482D2A),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                    ),
                                    onPressed: () {},
                                    child: const Text("Verify API Configuration"),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Component 0: White bottom telemetry strip / drawer
            Container(
              height: 48,
              width: double.infinity,
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Completed FirstKutAI Pipeline Integration • 100% Alignment",
                    style: TextStyle(
                      color: Colors.black85,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                  Row(
                    children: [
                      _buildFooterBadge("SAM 470495"),
                      const SizedBox(width: 8),
                      _buildFooterBadge("OCR 213685"),
                      const SizedBox(width: 8),
                      _buildFooterBadge("CLIP 0385"),
                    ],
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTab(String label, Color color, bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(4),
        border: isActive ? Border.all(color: Colors.white38) : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: isActive ? Colors.white : Colors.white60,
          fontSize: 12,
          fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
        ),
      ),
    );
  }

  Widget _buildFooterBadge(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1A21),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}