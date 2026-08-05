import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

const COLORS = {
  primary: '#944a00',
  primaryContainer: '#e67e22',
  primaryFixed: '#ffdcc5',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#502600',
  secondary: '#006d37',
  secondaryContainer: '#7bf8a1',
  secondaryFixedDim: '#61de8a',
  tertiary: '#006497',
  surface: '#f7f9ff',
  surfaceLowest: '#ffffff',
  surfaceContainerLow: '#edf4ff',
  surfaceContainer: '#e3efff',
  surfaceContainerHigh: '#d9eaff',
  surfaceContainerHighest: '#d1e4fb',
  onSurface: '#091d2e',
  onSurfaceVariant: '#564337',
  outlineVariant: '#dcc1b1',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  background: '#f7f9ff',
};

const ROLE_ICONS: Record<string, string> = {
  admin: 'shield-account',
  merchant: 'store',
  driver: 'motorbike',
  customer: 'account',
};

interface RoleLink {
  href: string;
  icon: string;
  label: string;
}

const ROLE_LINKS: Record<string, RoleLink[]> = {
  admin: [{ href: '/admin', icon: 'shield-account', label: 'Admin Panel' }],
  merchant: [{ href: '/merchant', icon: 'store', label: 'Seller Dashboard' }],
  driver: [{ href: '/driver', icon: 'motorbike', label: 'Driver Dashboard' }],
  customer: [],
};

export const CustomerDashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [user]);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Not signed in';
  const email = user?.email || '';
  const role = user?.user_metadata?.role || 'customer';
  const createdAt = user?.created_at || user?.metadata?.creationTime;
  const joinedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Unknown';

  const roleLinks = ROLE_LINKS[role] || [];

  const handleSignOut = async () => {
    await logout();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.notSignedIn}>
            <MaterialCommunityIcons name="account-off" size={64} color={COLORS.onSurfaceVariant} />
            <Text style={styles.notSignedInText}>You're not signed in.</Text>
            <TouchableOpacity
              style={styles.signInBtn}
              activeOpacity={0.8}
              onPress={() => navigation?.navigate?.('Auth')}
            >
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Avatar + Name */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons
              name={ROLE_ICONS[role] || 'account'}
              size={40}
              color={COLORS.secondary}
            />
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.userEmail}>{email}</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>{role}</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email" size={20} color={COLORS.onSurfaceVariant} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="badge-account" size={20} color={COLORS.onSurfaceVariant} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{role}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={20} color={COLORS.onSurfaceVariant} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Member since</Text>
              <Text style={styles.infoValue}>{joinedDate}</Text>
            </View>
          </View>
        </View>

        {/* Role-specific links */}
        {roleLinks.length > 0 && (
          <View style={styles.roleLinksSection}>
            {roleLinks.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={styles.roleLinkBtn}
                activeOpacity={0.9}
                onPress={() => {}}
              >
                <MaterialCommunityIcons
                  name={link.icon as any}
                  size={20}
                  color={COLORS.onPrimary}
                />
                <Text style={styles.roleLinkLabel}>{link.label}</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={COLORS.onPrimary}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <TouchableOpacity
            style={styles.quickActionRow}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate?.('Orders')}
          >
            <MaterialCommunityIcons name="receipt" size={20} color={COLORS.secondary} />
            <Text style={styles.quickActionLabel}>My Orders</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
          <View style={styles.infoDivider} />
          <TouchableOpacity
            style={styles.quickActionRow}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate?.('Search')}
          >
            <MaterialCommunityIcons name="storefront" size={20} color={COLORS.secondary} />
            <Text style={styles.quickActionLabel}>Browse Sellers</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          activeOpacity={0.8}
          onPress={handleSignOut}
        >
          <MaterialCommunityIcons name="logout" size={20} color={COLORS.onErrorContainer} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0, 109, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(0, 109, 55, 0.25)',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.onSurface,
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
  },
  roleChip: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 109, 55, 0.1)',
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceContainer,
  },
  roleLinksSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  roleLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
  },
  roleLinkLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onPrimary,
    fontFamily: 'Montserrat',
  },
  quickActionsCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
    marginBottom: 24,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  quickActionLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  signOutBtn: {
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.errorContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onErrorContainer,
    marginLeft: 8,
  },
  notSignedIn: {
    alignItems: 'center',
    paddingTop: 80,
  },
  notSignedInText: {
    fontSize: 15,
    color: COLORS.onSurfaceVariant,
    marginTop: 16,
    marginBottom: 24,
  },
  signInBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 28,
  },
  signInBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
  bottomSpacer: {
    height: 100,
  },
});
