import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Platform,
} from 'react-native';
import { auth, db } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';

const ProfileScreen = ({ navigation }) => {
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updatingUsername, setUpdatingUsername] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const ensureUserDocument = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

      if (!userDoc.exists()) {
        console.log('⚠️ User document not found, creating...');

        await setDoc(doc(db, 'users', currentUser.uid), {
          email: currentUser.email,
          displayName: currentUser.email?.split('@')[0] || 'User',
          teamMembers: [],
          createdAt: new Date().toISOString(),
        });

        console.log('✅ User document created');
      }
    } catch (error) {
      console.error('Error ensuring user document:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;

      if (currentUser) {
        setUserEmail(currentUser.email || 'No email');

        await ensureUserDocument();

        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.displayName || userData.email?.split('@')[0] || 'User');

          const teamMembers = userData.teamMembers || [];
          setTeamMembersCount(teamMembers.length);
        } else {
          setUserName(currentUser.email?.split('@')[0] || 'User');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserProfile();
    });

    return unsubscribe;
  }, [navigation]);

  const handleEditUsername = () => {
    setNewUsername(userName);
    setShowUsernameModal(true);
  };

  const closeUsernameModal = () => {
    setShowUsernameModal(false);
    setNewUsername('');
  };

  const performUsernameUpdate = async () => {
    const trimmedUsername = newUsername.trim();

    if (!trimmedUsername) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (trimmedUsername.length < 2) {
      Alert.alert('Error', 'Username must be at least 2 characters');
      return;
    }

    if (trimmedUsername.length > 50) {
      Alert.alert('Error', 'Username must be less than 50 characters');
      return;
    }

    if (trimmedUsername === userName) {
      closeUsernameModal();
      return;
    }

    setUpdatingUsername(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      console.log('📝 Updating username to:', trimmedUsername);

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: trimmedUsername,
        updatedAt: new Date().toISOString(),
      });

      console.log('✅ Username updated successfully');

      await loadUserProfile();
      closeUsernameModal();

      Alert.alert('Success', 'Your username has been updated!');

    } catch (error) {
      console.error('❌ Username update error:', error);
      Alert.alert('Error', error.message || 'Failed to update username');
    } finally {
      setUpdatingUsername(false);
    }
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const validatePasswordChange = () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return false;
    }

    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return false;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return false;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return false;
    }

    return true;
  };

  const performPasswordChange = async () => {
    if (!validatePasswordChange()) {
      return;
    }

    setChangingPassword(true);

    try {
      const user = auth.currentUser;

      if (!user || !user.email) {
        throw new Error('No authenticated user found');
      }

      console.log('🔐 Attempting to change password...');

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      try {
        await reauthenticateWithCredential(user, credential);
        console.log('✅ Re-authentication successful');
      } catch (reauthError) {
        console.error('❌ Re-authentication failed:', reauthError);

        if (reauthError.code === 'auth/wrong-password') {
          throw new Error('Current password is incorrect');
        } else if (reauthError.code === 'auth/too-many-requests') {
          throw new Error('Too many failed attempts. Please try again later');
        } else if (reauthError.code === 'auth/user-mismatch') {
          throw new Error('Authentication error. Please log out and try again');
        } else {
          throw new Error('Current password is incorrect');
        }
      }

      await updatePassword(user, newPassword);
      console.log('✅ Password updated successfully');

      closePasswordModal();

      Alert.alert(
        'Success',
        'Your password has been changed successfully!',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Password change error:', error);
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const performLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleManageTeamMembers = () => {
    navigation.navigate('TeamMember');
  };

  const handleViewMeetings = () => {
    navigation.navigate('Home');
  };

  const handleAbout = () => {
    Alert.alert(
      'About Meeting Assistant',
      'Version 1.0.0\n\nAI-Powered Meeting Transcription and Task Assignment System\n\n© 2025 All Rights Reserved',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          
          <TouchableOpacity 
            style={styles.editUsernameButton}
            onPress={handleEditUsername}
          >
            <Text style={styles.editUsernameText}>✏️ Edit Username</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{teamMembersCount}</Text>
            <Text style={styles.statLabel}>Team Members</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>✓</Text>
            <Text style={styles.statLabel}>Active Account</Text>
          </View>
        </View>

        {/* Account Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={toggleTheme}
          >
            <View style={styles.optionLeft}>
              <Text style={styles.optionIcon}>{isDarkMode ? '🌙' : '☀️'}</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </Text>
                <Text style={styles.optionSubtext}>
                  Tap to switch to {isDarkMode ? 'light' : 'dark'} theme
                </Text>
              </View>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleManageTeamMembers}
          >
            <View style={styles.optionLeft}>
              <Text style={styles.optionIcon}>👥</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Manage Team Members</Text>
                <Text style={styles.optionSubtext}>
                  {teamMembersCount} member{teamMembersCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleViewMeetings}
          >
            <View style={styles.optionLeft}>
              <Text style={styles.optionIcon}>📋</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>My Meetings</Text>
                <Text style={styles.optionSubtext}>View all recorded meetings</Text>
              </View>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleChangePassword}
          >
            <View style={styles.optionLeft}>
              <Text style={styles.optionIcon}>🔒</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Change Password</Text>
                <Text style={styles.optionSubtext}>Update your password</Text>
              </View>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleAbout}
          >
            <View style={styles.optionLeft}>
              <Text style={styles.optionIcon}>ℹ️</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>About</Text>
                <Text style={styles.optionSubtext}>Version & info</Text>
              </View>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Meeting Assistant v1.0.0</Text>
          <Text style={styles.footerSubtext}>© 2025 All Rights Reserved</Text>
        </View>
      </ScrollView>

      <Modal
        visible={showUsernameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeUsernameModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ Edit Username</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter new username"
              placeholderTextColor={theme.placeholder}
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="words"
              maxLength={50}
            />

            <Text style={styles.modalHint}>
              Choose a name that represents you (2-50 characters)
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeUsernameModal}
                disabled={updatingUsername}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={performUsernameUpdate}
                disabled={updatingUsername}
              >
                {updatingUsername ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closePasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔒 Change Password</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Current Password"
              placeholderTextColor={theme.placeholder}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="New Password (min 6 characters)"
              placeholderTextColor={theme.placeholder}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Confirm New Password"
              placeholderTextColor={theme.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closePasswordModal}
                disabled={changingPassword}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={performPasswordChange}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Change</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.textSecondary,
  },
  userCard: {
    backgroundColor: theme.surface,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.textInverse,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 15,
  },
  editUsernameButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 5,
  },
  editUsernameText: {
    color: theme.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginTop: 30,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 15,
    paddingLeft: 5,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionSubtext: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  optionArrow: {
    fontSize: 24,
    color: theme.border,
    fontWeight: '300',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: theme.error,
    marginHorizontal: 20,
    marginTop: 30,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  logoutButtonDisabled: {
    backgroundColor: theme.textTertiary,
    opacity: 0.5,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  logoutText: {
    color: theme.textInverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: theme.textTertiary,
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 12,
    color: theme.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.modalBackground,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: theme.text,
  },
  modalInput: {
    backgroundColor: theme.inputBackground,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    color: theme.text,
  }, 
  modalHint: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: theme.inputBackground,
  },
  modalConfirmButton: {
    backgroundColor: theme.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default ProfileScreen;