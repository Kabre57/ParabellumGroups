import { useNavigation, useRouter } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import { Bell, Menu, UserRound } from 'lucide-react-native';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Badge, useTheme } from 'react-native-paper';

import { useNotificationStore } from '@/stores/notificationStore';

type IconProps = { size: number; color: string };

const MenuIcon = ({ size, color }: IconProps): JSX.Element => (
  <Menu size={size} color={color} accessible={false} />
);
const ProfileIcon = ({ size, color }: IconProps): JSX.Element => (
  <UserRound size={size} color={color} accessible={false} />
);

export function AppHeader({ title }: { title: string }): JSX.Element {
  const navigation = useNavigation<DrawerNavigationProp<Record<string, undefined>>>('/(app)');
  const router = useRouter();
  const { colors } = useTheme();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const BellIcon = ({ size, color }: IconProps): JSX.Element => (
    <View>
      <Bell size={size} color={color} accessible={false} />
      {unreadCount > 0 ? <Badge size={16} style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</Badge> : null}
    </View>
  );

  return (
    <Appbar.Header mode="small" style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.outline }]}>
      <Appbar.Action
        icon={MenuIcon}
        accessibilityLabel="Ouvrir le menu de navigation"
        onPress={() => navigation.openDrawer()}
        color={colors.onSurface}
      />
      <Appbar.Content title={title} titleStyle={styles.title} />
      <Appbar.Action
        icon={BellIcon}
        accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
        onPress={() => router.navigate('/notifications')}
        color={colors.primary}
      />
      <Appbar.Action
        icon={ProfileIcon}
        accessibilityLabel="Mon profil"
        onPress={() => router.navigate('/profil')}
        color={colors.primary}
      />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 20, fontWeight: '600' },
  badge: { position: 'absolute', top: -7, right: -9, backgroundColor: '#dc2626' },
});
