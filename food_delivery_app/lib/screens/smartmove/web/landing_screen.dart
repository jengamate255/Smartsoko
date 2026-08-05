import 'package:flutter/material.dart';

class SmartMoveWebLandingScreen extends StatefulWidget {
  const SmartMoveWebLandingScreen({super.key});

  @override
  State<SmartMoveWebLandingScreen> createState() => _SmartMoveWebLandingScreenState();
}

class _SmartMoveWebLandingScreenState extends State<SmartMoveWebLandingScreen> {
  int _selectedCategory = 0;

  final _categories = [
    ('Luxe', Icons.directions_car, '\$45.00'),
    ('Executive', Icons.airport_shuttle, '\$62.50'),
    ('SUV', Icons.directions_bus, '\$80.00'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0c0e12),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildTopBar(),
            _buildHeroSection(),
            _buildDetailsSection(),
            _buildFooter(),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Container(
      width: double.infinity,
      height: 80,
      decoration: BoxDecoration(
        color: const Color(0xFF111317).withOpacity(0.8),
        border: Border(
          bottom: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
      ),
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 1440),
          padding: const EdgeInsets.symmetric(horizontal: 64),
          child: Row(
            children: [
              Text(
                'LuxeRide',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFFe2e2e7),
                  letterSpacing: -0.5,
                  fontFamily: 'Plus Jakarta Sans',
                ),
              ),
              const Spacer(),
              ...['Book', 'Trips', 'Wallet', 'Driver Portal'].map((item) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      item,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: item == 'Book' ? FontWeight.w600 : FontWeight.w500,
                        color: item == 'Book'
                            ? const Color(0xFFadc6ff)
                            : const Color(0xFFc1c6d7),
                      ),
                    ),
                  )),
              const Spacer(),
              TextButton(
                onPressed: () {},
                child: const Text(
                  'Sign In',
                  style: TextStyle(color: Color(0xFFc1c6d7), fontWeight: FontWeight.w500),
                ),
              ),
              const SizedBox(width: 16),
              Container(
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFadc6ff),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFadc6ff).withOpacity(0.2),
                      blurRadius: 12,
                    ),
                  ],
                ),
                child: TextButton(
                  onPressed: () {},
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                  ),
                  child: const Text(
                    'Join Luxe',
                    style: TextStyle(
                      color: Color(0xFF00285c),
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeroSection() {
    return Container(
      height: MediaQuery.of(context).size.height - 80,
      width: double.infinity,
      child: Stack(
        children: [
          Positioned.fill(
            child: Container(
              color: const Color(0xFF0c0e12),
              child: Column(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: RadialGradient(
                          center: const Alignment(0.3, 0.5),
                          radius: 1.5,
                          colors: [
                            Colors.transparent,
                            const Color(0xFF0c0e12).withOpacity(0.8),
                            const Color(0xFF0c0e12),
                          ],
                        ),
                      ),
                      child: Center(
                        child: Container(
                          width: double.infinity,
                          height: double.infinity,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                const Color(0xFFadc6ff).withOpacity(0.05),
                                Colors.transparent,
                                Colors.transparent,
                                const Color(0xFF0c0e12),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Center(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 1440),
              padding: const EdgeInsets.symmetric(horizontal: 64),
              child: Row(
                children: [
                  Flexible(
                    flex: 4,
                    child: _buildBookingCard(),
                  ),
                  const Spacer(flex: 1),
                  Flexible(
                    flex: 5,
                    child: _buildHeroContent(),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookingCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.15)),
          left: BorderSide(color: Colors.white.withOpacity(0.08)),
          right: BorderSide(color: Colors.white.withOpacity(0.08)),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 40,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Where to?',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w600,
              color: const Color(0xFFe2e2e7),
              letterSpacing: -0.02,
              fontFamily: 'Plus Jakarta Sans',
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Experience travel redefined.',
            style: TextStyle(
              fontSize: 16,
              color: const Color(0xFFc1c6d7).withOpacity(0.8),
            ),
          ),
          const SizedBox(height: 24),
          _buildLocationInput(
            Icons.my_location,
            'Pickup location',
            const Color(0xFFadc6ff),
          ),
          const SizedBox(height: 12),
          _buildLocationInput(
            Icons.location_on,
            'Where to?',
            const Color(0xFFadc6ff),
          ),
          const SizedBox(height: 24),
          Text(
            'VEHICLE CATEGORY',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.2,
              color: const Color(0xFFc1c6d7),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: List.generate(_categories.length, (i) {
              final (name, icon, price) = _categories[i];
              final isSelected = _selectedCategory == i;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    left: i > 0 ? 8 : 0,
                    right: i < _categories.length - 1 ? 8 : 0,
                  ),
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedCategory = i),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? Color(0xFFadc6ff).withOpacity(0.1)
                            : Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected
                              ? const Color(0xFFadc6ff)
                              : Colors.white.withOpacity(0.1),
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        children: [
                          Icon(icon, color: isSelected ? const Color(0xFFadc6ff) : const Color(0xFFc1c6d7), size: 24),
                          const SizedBox(height: 8),
                          Text(
                            name,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: isSelected ? const Color(0xFFadc6ff) : const Color(0xFFc1c6d7),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            price,
                            style: TextStyle(
                              fontSize: 10,
                              color: isSelected ? const Color(0xFFadc6ff) : const Color(0xFFc1c6d7).withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildOptionButton(Icons.calendar_today, 'Schedule for later'),
              _buildOptionButton(Icons.tune, 'Preferences'),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFadc6ff),
                foregroundColor: const Color(0xFF00285c),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
                shadowColor: const Color(0xFFadc6ff).withOpacity(0.3),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Book Now',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'Plus Jakarta Sans',
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Icon(Icons.arrow_forward),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationInput(IconData icon, String hint, Color iconColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF1e2023).withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 20),
          const SizedBox(width: 12),
          Text(
            hint,
            style: TextStyle(
              color: const Color(0xFFc1c6d7).withOpacity(0.5),
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOptionButton(IconData icon, String label) {
    return TextButton.icon(
      onPressed: () {},
      icon: Icon(icon, size: 20, color: const Color(0xFFc1c6d7)),
      label: Text(
        label,
        style: const TextStyle(
          color: Color(0xFFc1c6d7),
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildHeroContent() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          'Uncompromising\nStandards.',
          textAlign: TextAlign.right,
          style: TextStyle(
            fontSize: 72,
            fontWeight: FontWeight.w700,
            color: Colors.white,
            letterSpacing: -0.04,
            height: 1.1,
            fontFamily: 'Plus Jakarta Sans',
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'LuxeRide offers more than just a destination. We provide a sanctuary on wheels, curated for the modern executive.',
          textAlign: TextAlign.right,
          style: TextStyle(
            fontSize: 18,
            color: const Color(0xFFc1c6d7),
            height: 1.5,
            fontFamily: 'Inter',
          ),
        ),
        const SizedBox(height: 48),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            _buildStat('15 min', 'Average Wait'),
            const SizedBox(width: 32),
            _buildStat('4.9/5', 'Elite Rating'),
            const SizedBox(width: 32),
            _buildStat('24/7', 'Support'),
          ],
        ),
      ],
    );
  }

  Widget _buildStat(String value, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w600,
            color: Color(0xFFadc6ff),
            fontFamily: 'Plus Jakarta Sans',
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.2,
            color: const Color(0xFFc1c6d7),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailsSection() {
    return Container(
      color: const Color(0xFF111317),
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 1440),
          padding: const EdgeInsets.symmetric(horizontal: 64),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 8,
                    child: Container(
                      height: 400,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(24),
                        color: const Color(0xFF1a1c1f),
                      ),
                      child: Stack(
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(24),
                              gradient: LinearGradient(
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                                colors: [
                                  const Color(0xFF111317),
                                  Colors.transparent,
                                ],
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 32,
                            left: 32,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'The Cabin Experience',
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                    fontFamily: 'Plus Jakarta Sans',
                                  ),
                                ),
                                const SizedBox(height: 8),
                                SizedBox(
                                  width: 400,
                                  child: Text(
                                    'Climate control, premium sound, and curated refreshments in every ride.',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: const Color(0xFFc1c6d7),
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
                  const SizedBox(width: 32),
                  Expanded(
                    flex: 4,
                    child: Column(
                      children: [
                        _buildInfoCard(
                          Icons.verified_user,
                          'Safety Protocol',
                          'Every chauffeur is vetted through a rigorous 5-step background check and professional driving assessment.',
                          const Color(0xFFadc6ff).withOpacity(0.05),
                        ),
                        const SizedBox(height: 16),
                        _buildInfoCard(
                          Icons.auto_awesome,
                          'Smart Route',
                          'Real-time AI pathfinding ensures you avoid congestion and arrive exactly when intended.',
                          const Color(0xFFadc6ff).withOpacity(0.1),
                          accent: true,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard(IconData icon, String title, String description, Color bg, {bool accent = false}) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFadc6ff).withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: const Color(0xFFadc6ff), size: 40),
          const Spacer(),
          Text(
            title,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: accent ? const Color(0xFFadc6ff) : Colors.white,
              fontFamily: 'Plus Jakarta Sans',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFFc1c6d7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48),
      decoration: BoxDecoration(
        color: const Color(0xFF0c0e12),
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.05)),
        ),
      ),
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 1440),
          padding: const EdgeInsets.symmetric(horizontal: 64),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'LuxeRide',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFFe2e2e7),
                        fontFamily: 'Plus Jakarta Sans',
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: 280,
                      child: Text(
                        'Redefining the standard of executive urban mobility for the global professional.',
                        style: TextStyle(color: const Color(0xFFc1c6d7), fontSize: 16),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildFooterLinks('Company', ['Careers', 'Press', 'Safety']),
                    const SizedBox(width: 48),
                    _buildFooterLinks('Support', ['Help Center', 'Contact Us', 'Terms of Service']),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        _buildSocialIcon(Icons.public),
                        const SizedBox(width: 16),
                        _buildSocialIcon(Icons.share),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Text(
                      '© 2024 LuxeRide Global. All rights reserved.',
                      style: TextStyle(
                        fontSize: 12,
                        color: const Color(0xFFc1c6d7),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFooterLinks(String title, List<String> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title.toUpperCase(),
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.5,
            color: const Color(0xFFadc6ff),
          ),
        ),
        const SizedBox(height: 16),
        ...items.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                item,
                style: const TextStyle(color: Color(0xFFc1c6d7), fontSize: 16),
              ),
            )),
      ],
    );
  }

  Widget _buildSocialIcon(IconData icon) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: IconButton(
        onPressed: () {},
        icon: Icon(icon, size: 20, color: const Color(0xFFc1c6d7)),
        padding: EdgeInsets.zero,
      ),
    );
  }
}
