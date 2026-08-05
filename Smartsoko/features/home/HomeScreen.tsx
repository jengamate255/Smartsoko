import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Dimensions,
  StyleSheet,
  RefreshControl,
  FlatList,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useProductsStore } from '../store/productsStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 16;
const CARD_GAP = 12;

const COLORS = {
  primary: '#944a00',
  primaryContainer: '#e67e22',
  primaryFixed: '#ffdcc5',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#502600',
  secondary: '#006d37',
  secondaryContainer: '#7bf8a1',
  secondaryFixed: '#7efba4',
  secondaryFixedDim: '#61de8a',
  tertiary: '#006497',
  tertiaryContainer: '#51a0db',
  tertiaryFixed: '#cce5ff',
  tertiaryFixedDim: '#92ccff',
  surface: '#f7f9ff',
  surfaceLowest: '#ffffff',
  surfaceContainerLow: '#edf4ff',
  surfaceContainer: '#e3efff',
  surfaceContainerHigh: '#d9eaff',
  surfaceContainerHighest: '#d1e4fb',
  surfaceVariant: '#d1e4fb',
  surfaceDim: '#c9dcf3',
  surfaceBright: '#f7f9ff',
  surfaceTint: '#944a00',
  onSurface: '#091d2e',
  onSurfaceVariant: '#564337',
  onBackground: '#091d2e',
  outline: '#897365',
  outlineVariant: '#dcc1b1',
  inverseSurface: '#203243',
  inverseOnSurface: '#e8f2ff',
  inversePrimary: '#ffb783',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',
  background: '#f7f9ff',
};

const CATEGORIES = [
  { id: 'fashion', label: 'Fashion', icon: 'tshirt-crew' },
  { id: 'agri', label: 'Agri-Proc', icon: 'sprout' },
  { id: 'handicrafts', label: 'Handicrafts', icon: 'palette' },
  { id: 'electronics', label: 'Electronics', icon: 'devices' },
];

const HERO_BANNERS = [
  {
    id: 'kenya',
    title: 'Verified Merchants from Kenya',
    subtitle: 'Spotlight',
    buttonText: 'Explore Hub',
    bgColor: COLORS.primaryContainer,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7aDga-VVxbfbQWRn0bcSv7VyoX1khGyTMwYCYvrexEP_abQp39_lElGNLB0tkQ55o-JHDnA88_zA2zUXmkQQdQjgBhqfcFvlVUGAyzH3t4Al0G9AYIGRY4jQ8lEi9Gc2c-MDDmkC3ksVHTGt-HB00z5ZanLsuKsjV03qEesNOvI3pgoKkF-n7Ex6cDJoJ6dTGV5Hj3fA7Qg357IT1PMRKieXygQuy-H1lMXeTIumF3KRjl3KAYj50NygwRK5r_GwGuDlCDAoQ5J8B',
  },
  {
    id: 'logistics',
    title: 'Next-Day Hub Delivery',
    subtitle: 'Logistics',
    buttonText: 'Learn More',
    bgColor: COLORS.secondaryContainer,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7hhcnMYbpbfMLyZ3v92AKeYMjXjbkWESe1qow8h1B102QM2NUqGmYERXQJ_WaKLgneLzOqfIDoNVGgKWkZUpIHasdZDKo2eGp6p3lE5BwSuIpKPtkhye1jrGWHYqdqXnCipnAjnsJnhdkeX6YpWJzgdWOsQ5vTiZ9nU4qCmz-HD8byZmOOUorLfY4DMx6z5lWHnasaMLRzIy0UYR819P9p8o5wEOgL7SklidkCTzd46qYVtNxLq0kgQe2kJvwXzxVPrRNwctw3vqD',
  },
];

const FLASH_ITEMS = [
  {
    id: 'lantern',
    title: 'Solar Lantern',
    price: 'KES 1,200',
    originalPrice: 'KES 2,000',
    discount: '-40%',
    soldPercent: 75,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLjygss-dJE6W_zWUsB-F4jWfx_FMg_c9tYwiuyFq3JNPBJMNpi1TiFtw_7hd5Sz9HPal50OdNdMmT5dAKhJZWAaIy8hq-ZcDCNC7a-4u9jPNleMr45TkwlZsr1JwXEwcmadSiv8cfcdq4Vtzblz7x6uE5dVF-Cyug87ce6Manh6jIXLDdxUHdpNj4VouCoruFLY06yQfFVToC7yEz4duRa5_1n8Iwvgp2rBGgqOf8AlLRTkIxssspnDpZLBiU-r8hG1XBRRmSIVNL',
  },
  {
    id: 'sandals',
    title: 'Maasai Sandals',
    price: 'KES 2,450',
    originalPrice: 'KES 2,880',
    discount: '-15%',
    soldPercent: 20,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0rIk5tKikK3DLhptDwL299WfJm5OLODP79KfxRWb_41clQenrmCeZhhRwcd7nqd1wQTbtlJyoaTK2jPohjuVmJDGPf-bWO51cq6Sgzkg3a0TLx6NVqfL_iPhbAdXCm8W9o_oSKZj7M47UxFtx0KgBKfcWTcOUSVZLcQ0znnTB5E3HE08gZl-tsMyD1gIY_05cGo24lma37Raau_CnVTN1uPOHL_N3sHLrizb_aROghEM3u0lb1_B1TP04aJKzQr4-Te1jGjRYOuir',
  },
  {
    id: 'coffee',
    title: 'Coffee Set',
    price: 'KES 3,800',
    originalPrice: 'KES 5,067',
    discount: '-25%',
    soldPercent: 90,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9sfvVvLnxAPlvCxisRPMp4eY73FHsyV4pMYbrBb3aZNL_1n3tSw8o4IfuUw6ITPzkssm8WYnUMA6EgK2GmCICH1Uy_ahBUNdPMOm63Lu88mki2lYJT4sh1yEiQxjN4Bi_SdjTxb6D5Xynfw_ja_Z8ziMzWe11xKLDdy15gfHWJ6aZfd37SBC7fPNn73AxR0l13aGXjsl9M0hbXsCQ4jHSfT3pat8VZHLVrTSSdBNt_4AMCziUWswj41hkAKGEUSx_M02l8KR29993',
  },
];

const REGIONAL_ITEMS = [
  {
    id: 'shea',
    title: 'Premium Shea Butter',
    merchant: 'Ghana Gold Ltd.',
    merchantLogo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-uWNxLvdV_lBTyLreZiIdItpAFAaLfVCr3ycCEPCVmp1aH-xJW5tGkLYwghJruhJvz0c7pT3W6ByY3ERQeLTPnTUfeAIYkY-Mu0qGtvlf6Uk0ugKTzt5kp1znYXj5Hjsg8vC7Bv27bZQHQ1uTTS1NdwNe_fQ4ym6jm7SkBH_L_ofK-eOBVLUOa4vpo_r4Dw-5-vF12tFo_kSasCpPQ6Pu-UGLA3XfaMktxpnqiWwuglKNOWbdGxUN43PT4Fj_BJ8sMpqXM6aiuM3w',
    price: 'GHS 85.00',
    verified: true,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3glIMbHJ65v8yBaXwxAkSawEB-MZagCC7U1KiW6zttScZ-IpV8UpIyc4KKUMSfqG5kZ228h27c3HODmaLcVLL8GOurkXNGnPuONrVmjc1UrFVvM0bbyD4_Ze5N5Q1IqJOL3XC8So3UqBnZG-uWz95HiEIhZXGV0UdmZ72f1TeTztlk0zH1IX0A1OB3zy1ZdVF9Pxq8gQcg6jux1LIt3ooNntJFDdllCHOd9drji__IKk94FRVvXYgrACYqsdvfj1-AZIPgaLq6f7o',
  },
  {
    id: 'kente',
    title: 'Authentic Kente Wrap',
    merchant: 'Bonwire Hub',
    merchantLogo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_eineUBCCpoh3ZPc1m0_KlHecImLigKWQMpiSIYMleQSY3r_qo6yvanRkiv7BrV496I1X1jqDt8NDjmNaEzs6w-LgH3HA4MeQKCDWzpe6DsET4Q4aTQmFEQbKm8ZGXkE1cYINTWjTvRBd561PFKF2LcDPRoBGyxZLaw3Tqroy7KBpmEhlS5TaGI0X3mnkVxxVlGoP6HARtb-7up32Rs-YWOAyux1Kc1WJuJehPQcsJ3LVgT0zNOm05gE07WLsZalxU6o0gSzwMds6',
    price: 'GHS 420.00',
    verified: true,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAkZntGk396kC-ql0edMBF6mSBCaCprlRpahZCrYwgN6w7wS1LhhhArkY_g4K4uVVftMf-3B9n1VTTkptzVFrZkCvofCeBhT0hNabAFGbK3qZoGQQsZeZYwNT7r6h6EjZCFwR52ia_g2VLtzBCI2wgm2CkUGsSzBQFjKbQ5AZDUGsP0UVz1sSTbr2khYYXKclKOied2U1-GeY-9ZVyunxzeBDgLiI7xeiRDDdQgn8mAaJvR9FJdKkyQMxVrosN0yz0GNgZet2OvXShz',
  },
];

const FEATURED_MERCHANTS = [
  {
    id: 'tekno',
    name: 'TeknoNairobi',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAO-9ASwXgMvOL6TpGDiCFyO5UQbE6dPxsuelCXv2gRXz4ksoLQAErquiqOMPKMY-INTR_9-nSNQgdMseqUDyp2VG44C6JFf2k1wBI96P7if6JWxcvGJLydC5wNvl4IOHAvG-9W2DYeiMbFpN93RgOQTiN8YHKENoNuqaq0Qt1G_uguzudjM13Si8CLdYBLEeqRzQYH4LOpHiRdrXWvbP_2OsBRDBsNYHV7XtiVl-AIxO5yHUYhLUDVA_lylil2fb9759Q_4hb9O7xw',
    rating: 4.9,
    reviews: '1.2k',
    followed: false,
  },
  {
    id: 'habesha',
    name: 'Habesha Brews',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmV20gtm8LpWwVQxBl7-rzmoGv86opQPti_LzF3CKZor3GCJO3SB9q_WPm15D7EoEbQJ9RfikrXq7vRMlYM8h0buiqoMFI9c73amFzCfCtd489jcdiuuIODgvv80l7zkvhCERAqXZoxlVNwmX0JQz1nlh3WYtLOCsaG3kb6wDLJFdOVvEdjaJ7G8QYzB-r9DG4cs_LbhhnJcTFLR_ibyJ5Vjx-ojdZx11sc5-Lc9-_kVmZP9GkF7MJ3ii3v4SOqzbt-JblwirVm-V8',
    rating: 4.8,
    reviews: '850',
    followed: false,
  },
];

export const HomeScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { products, loading, error, fetchProducts } = useProductsStore();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [bannerIndex, setBannerIndex] = useState(0);
  const [flashTime, setFlashTime] = useState({ hours: 4, minutes: 22, seconds: 19 });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFlashTime(prev => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % HERO_BANNERS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, []);

  const onProductPress = (product: any) => {
    if (navigation) {
      navigation.navigate('ProductDetail', { productId: product.id, product });
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <MaterialCommunityIcons key={i} name="star" size={14} color={COLORS.primary} />
        );
      } else if (i === fullStars && hasHalf) {
        stars.push(
          <MaterialCommunityIcons key={i} name="star-half-full" size={14} color={COLORS.primary} />
        );
      } else {
        stars.push(
          <MaterialCommunityIcons key={i} name="star-outline" size={14} color={COLORS.primary} />
        );
      }
    }
    return stars;
  };

  const renderCategory = ({ item }: { item: typeof CATEGORIES[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        { marginRight: item.id === CATEGORIES[CATEGORIES.length - 1].id ? 0 : CARD_GAP },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.categoryIcon}>
        <MaterialCommunityIcons name={item.icon} size={24} color={COLORS.primary} />
      </View>
      <Text style={styles.categoryLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  const renderFlashItem = ({ item }: { item: typeof FLASH_ITEMS[0] }) => (
    <TouchableOpacity
      style={[
        styles.flashItem,
        { marginRight: item.id === FLASH_ITEMS[FLASH_ITEMS.length - 1].id ? 0 : CARD_GAP },
      ]}
      activeOpacity={0.8}
      onPress={() => onProductPress({ id: item.id, title: item.title, price: item.price })}
    >
      <View style={styles.flashItemImageWrapper}>
        <Image source={{ uri: item.imageUrl }} style={styles.flashItemImage} />
        <View style={styles.flashDiscount}>
          <Text style={styles.flashDiscountText}>{item.discount}</Text>
        </View>
      </View>
      <Text style={styles.flashTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.flashPrice}>{item.price}</Text>
      <View style={styles.flashProgressWrapper}>
        <View style={styles.flashProgressBar}>
          <View
            style={[
              styles.flashProgressFill,
              { width: `${item.soldPercent}%` },
            ]}
          />
        </View>
        <Text style={styles.flashSoldText}>{item.soldPercent}% Sold</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRegionalItem = ({ item }: { item: typeof REGIONAL_ITEMS[0] }) => (
    <TouchableOpacity
      style={[
        styles.regionalItem,
        { marginRight: item.id === REGIONAL_ITEMS[REGIONAL_ITEMS.length - 1].id ? 0 : CARD_GAP },
      ]}
      activeOpacity={0.8}
    >
      <View style={styles.regionalImageWrapper}>
        <Image source={{ uri: item.imageUrl }} style={styles.regionalImage} />
        {item.verified && (
          <View style={styles.regionalVerified}>
            <MaterialCommunityIcons name="check-decagram" size={10} color="#fff" />
            <Text style={styles.regionalVerifiedText}>Verified</Text>
          </View>
        )}
      </View>
      <View style={styles.regionalContent}>
        <Text style={styles.regionalTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.regionalMerchantRow}>
          <Image source={{ uri: item.merchantLogo }} style={styles.regionalMerchantLogo} />
          <Text style={styles.regionalMerchantName}>{item.merchant}</Text>
        </View>
        <Text style={styles.regionalPrice}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMerchant = ({ item }: { item: typeof FEATURED_MERCHANTS[0] }) => (
    <TouchableOpacity
      style={styles.merchantRow}
      activeOpacity={0.8}
      onPress={() => {}}
    >
      <View style={styles.merchantLogoWrapper}>
        <Image source={{ uri: item.logo }} style={styles.merchantLogo} />
      </View>
      <View style={styles.merchantInfo}>
        <Text style={styles.merchantName}>{item.name}</Text>
        <View style={styles.merchantRating}>
          <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
          <Text style={styles.merchantRatingText}>{item.rating}</Text>
          <Text style={styles.merchantReviewsText}>({item.reviews} Reviews)</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.followBtn,
          item.followed && styles.followBtnActive,
        ]}
        activeOpacity={0.8}
        onPress={(e) => { e.stopPropagation(); }}
      >
        <Text style={[
          styles.followBtnText,
          item.followed && styles.followBtnTextActive,
        ]}>
          {item.followed ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const featuredProducts = products.slice(0, 8);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.brandText}>SmartSoko</Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.topBarIcon} activeOpacity={0.7}>
            <MaterialCommunityIcons name="magnify" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDIYDkFAMXZDKlfpANnvnOI2QU1880nZwIllCOOZBFt8iHLEM4vaQRKHCwt0XgXgxb3zHQwaBtm4YRMduFWS5qItXt0K7CTZpRFHVfoKx2xS1y0pmcY7rxGP07h2w0p2MXsH7ZEvqq--sL0gscQmIJImx_pk7gS_hs2AUPky5wZxPxdK_lBLo-YZsRnRb6SRYZdlbI6R8TVcSqKfhJ0MTQx1vQyHl5KNNr8S12wy_P4NIuNFaGU27P73WUV8-ON6p5UkgkdnJ0gYyEi' }}
              style={styles.avatar}
            />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color={COLORS.onSurfaceVariant} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products, hubs or merchants..."
              placeholderTextColor={COLORS.onSurfaceVariant}
            />
          </View>
        </View>

        {/* Hero Banner Slider */}
        <View style={styles.bannerSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToInterval={SCREEN_WIDTH - H_PADDING * 2}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - H_PADDING * 2));
              setBannerIndex(index);
            }}
            contentContainerStyle={styles.bannerContainer}
          >
            {HERO_BANNERS.map((banner) => (
              <TouchableOpacity
                key={banner.id}
                style={[styles.bannerCard, { backgroundColor: banner.bgColor }]}
                activeOpacity={0.9}
              >
                <Image source={{ uri: banner.imageUrl }} style={styles.bannerImage} />
                <View style={styles.bannerOverlay} />
                <View style={styles.bannerContent}>
                  <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                  <TouchableOpacity
                    style={[styles.bannerBtn, { backgroundColor: '#fff', borderColor: '#fff' }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.bannerBtnText,
                      { color: banner.bgColor === COLORS.primaryContainer ? COLORS.primary : COLORS.secondary }
                    ]}>
                      {banner.buttonText}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.bannerDots}>
            {HERO_BANNERS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.bannerDot,
                  i === bannerIndex && styles.bannerDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        />

        {/* Flash Sales */}
        <View style={styles.flashSection}>
          <View style={styles.flashHeader}>
            <View style={styles.flashTitleWrapper}>
              <MaterialCommunityIcons
                name="flash"
                size={20}
                color={COLORS.primary}
                style={{ fontVariationSettings: "'FILL' 1" }}
              />
              <Text style={styles.flashTitle}>Flash Deals</Text>
            </View>
            <View style={styles.flashTimer}>
              <View style={styles.timerUnit}>
                <Text style={styles.timerValue}>{String(flashTime.hours).padStart(2, '0')}</Text>
                <Text style={styles.timerLabel}>HR</Text>
              </View>
              <Text style={styles.timerSeparator}>:</Text>
              <View style={styles.timerUnit}>
                <Text style={styles.timerValue}>{String(flashTime.minutes).padStart(2, '0')}</Text>
                <Text style={styles.timerLabel}>MIN</Text>
              </View>
              <Text style={styles.timerSeparator}>:</Text>
              <View style={styles.timerUnit}>
                <Text style={styles.timerValue}>{String(flashTime.seconds).padStart(2, '0')}</Text>
                <Text style={styles.timerLabel}>SEC</Text>
              </View>
            </View>
          </View>
          <FlatList
            data={FLASH_ITEMS}
            renderItem={renderFlashItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.flashScroll}
          />
        </View>

        {/* Regional Trade Spotlight */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Best of West Africa</Text>
            <Text style={styles.sectionSubtitle}>Quality goods from Lagos to Accra</Text>
          </View>
          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={REGIONAL_ITEMS}
          renderItem={renderRegionalItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionalScroll}
        />

        {/* Featured SMEs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Rated Merchants</Text>
        </View>
        <FlatList
          data={FEATURED_MERCHANTS}
          renderItem={renderMerchant}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.merchantSeparator} />}
          showsVerticalScrollIndicator={false}
        />

        {/* Trending Products from API */}
        <View style={[styles.sectionHeader, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Trending Products</Text>
          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {loading && products.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : error && products.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {featuredProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productCard,
                  { marginBottom: CARD_GAP },
                  featuredProducts.indexOf(product) % 2 === 0
                    ? { marginRight: CARD_GAP }
                    : {},
                ]}
                activeOpacity={0.9}
                onPress={() => onProductPress(product)}
              >
                <Image source={{ uri: product.image_url }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productVendor}>SmartSoko</Text>
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {product.title}
                  </Text>
                  <View style={styles.ratingRow}>{renderStars(4)}</View>
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>KES {product.price?.toLocaleString()}</Text>
                    <TouchableOpacity style={styles.addToCartBtn}>
                      <MaterialCommunityIcons name="cart-plus" size={18} color={COLORS.onPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <MaterialCommunityIcons name="chat" size={24} color={COLORS.onPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: H_PADDING,
    backgroundColor: COLORS.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    zIndex: 100,
  },
  topBarLeft: {
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  topBarIcon: {
    padding: 8,
    marginLeft: 8,
  },
  avatarWrapper: {
    marginLeft: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  searchSection: {
    marginTop: 56 + 12,
    paddingHorizontal: H_PADDING,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.onSurface,
  },
  bannerSection: {
    marginTop: 16,
    paddingHorizontal: H_PADDING,
  },
  bannerContainer: {
    paddingRight: H_PADDING,
  },
  bannerCard: {
    width: SCREEN_WIDTH - H_PADDING * 2,
    height: 176,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bannerContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 1,
  },
  bannerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 24,
    fontFamily: 'Montserrat',
    marginBottom: 8,
  },
  bannerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    alignSelf: 'flex-start',
  },
  bannerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  bannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.outlineVariant,
  },
  bannerDotActive: {
    width: 20,
    backgroundColor: COLORS.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginHorizontal: H_PADDING,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onSurface,
    fontFamily: 'Montserrat',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  categoryScroll: {
    paddingHorizontal: H_PADDING,
    paddingRight: H_PADDING + CARD_GAP,
  },
  categoryItem: {
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.onSurface,
    textAlign: 'center',
    width: 60,
  },
  flashSection: {
    marginTop: 16,
    paddingHorizontal: H_PADDING,
    backgroundColor: 'rgba(230, 126, 34, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(230, 126, 34, 0.2)',
    borderRadius: 20,
    padding: 16,
  },
  flashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flashTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flashTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.onSurface,
    fontFamily: 'Montserrat',
  },
  flashTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timerUnit: {
    alignItems: 'center',
  },
  timerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurface,
    fontFamily: 'Montserrat',
  },
  timerLabel: {
    fontSize: 8,
    color: COLORS.onSurfaceVariant,
  },
  timerSeparator: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
  },
  flashScroll: {
    paddingRight: H_PADDING,
  },
  flashItem: {
    width: 140,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  flashItemImageWrapper: {
    position: 'relative',
    height: 112,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  flashItemImage: {
    width: '100%',
    height: '100%',
  },
  flashDiscount: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  flashDiscountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  flashTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: 4,
  },
  flashPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'Montserrat',
    marginBottom: 6,
  },
  flashProgressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flashProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 2,
    overflow: 'hidden',
  },
  flashProgressFill: {
    height: '100%',
    backgroundColor: COLORS.error,
    borderRadius: 2,
  },
  flashSoldText: {
    fontSize: 9,
    color: COLORS.onSurfaceVariant,
  },
  regionalScroll: {
    paddingHorizontal: H_PADDING,
    paddingRight: H_PADDING + CARD_GAP,
  },
  regionalItem: {
    width: 220,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  regionalImageWrapper: {
    position: 'relative',
    height: 128,
  },
  regionalImage: {
    width: '100%',
    height: '100%',
  },
  regionalVerified: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  regionalVerifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  regionalContent: {
    padding: 12,
  },
  regionalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: 6,
  },
  regionalMerchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  regionalMerchantLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  regionalMerchantName: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  regionalPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'Montserrat',
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainer,
    marginBottom: 12,
  },
  merchantLogoWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainer,
    overflow: 'hidden',
  },
  merchantLogo: {
    width: '100%',
    height: '100%',
  },
  merchantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  merchantName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  merchantRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  merchantRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  merchantReviewsText: {
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
  },
  merchantSeparator: {
    height: 12,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primaryContainer,
    borderWidth: 1,
    borderColor: COLORS.primaryContainer,
  },
  followBtnActive: {
    backgroundColor: COLORS.surfaceLowest,
    borderColor: COLORS.primary,
  },
  followBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.onPrimary,
    fontFamily: 'Montserrat',
  },
  followBtnTextActive: {
    color: COLORS.primary,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: H_PADDING,
    gap: CARD_GAP,
  },
  productCard: {
    width: (SCREEN_WIDTH - H_PADDING * 2 - CARD_GAP) / 2,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
  },
  productInfo: {
    padding: 10,
  },
  productVendor: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'Montserrat',
  },
  addToCartBtn: {
    backgroundColor: COLORS.primaryContainer,
    padding: 6,
    borderRadius: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
  },
  bottomSpacer: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});