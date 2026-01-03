import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';

const TeamMembersScreen = ({ navigation }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { theme } = useTheme();
  const styles = createStyles(theme);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const ensureUserDocument = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        console.log('⚠️ User document not found, creating...');
        
        await setDoc(doc(db, 'users', userId), {
          email: auth.currentUser.email,
          displayName: auth.currentUser.email?.split('@')[0] || 'User',
          teamMembers: [],
          createdAt: new Date().toISOString(),
        });
        
        console.log('✅ User document created');
      }
    } catch (error) {
      console.error('Error ensuring user document:', error);
      throw error;
    }
  };

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await ensureUserDocument();

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setTeamMembers(data.teamMembers || []);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      Alert.alert('Error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const addTeamMember = async () => {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      Alert.alert('Error', 'Please enter both name and email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const isDuplicate = teamMembers.some(
      member => member.email.toLowerCase() === newMemberEmail.toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert('Error', 'This email is already in your team');
      return;
    }

    try {
      setSaving(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const newMember = {
        id: Date.now().toString(),
        name: newMemberName.trim(),
        email: newMemberEmail.trim().toLowerCase(),
        addedAt: new Date().toISOString()
      };

      const updatedMembers = [...teamMembers, newMember];

      await updateDoc(doc(db, 'users', userId), {
        teamMembers: updatedMembers
      });

      setTeamMembers(updatedMembers);
      setNewMemberName('');
      setNewMemberEmail('');

      Alert.alert('Success', 'Team member added successfully');
    } catch (error) {
      console.error('Error adding team member:', error);
      Alert.alert('Error', 'Failed to add team member');
    } finally {
      setSaving(false);
    }
  };

  const deleteTeamMember = async (memberId) => {
    Alert.alert(
      'Delete Team Member',
      'Are you sure you want to remove this team member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = auth.currentUser?.uid;
              if (!userId) return;

              const updatedMembers = teamMembers.filter(m => m.id !== memberId);

              await updateDoc(doc(db, 'users', userId), {
                teamMembers: updatedMembers
              });

              setTeamMembers(updatedMembers);
              Alert.alert('Success', 'Team member removed');
            } catch (error) {
              console.error('Error deleting team member:', error);
              Alert.alert('Error', 'Failed to remove team member');
            }
          }
        }
      ]
    );
  };

  const renderTeamMember = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>👤 {item.name}</Text>
        <Text style={styles.memberEmail}>📧 {item.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteTeamMember(item.id)}
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading team members...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 Add your team members here. When tasks are assigned to them in meetings,
          they'll automatically receive email notifications.
        </Text>
      </View>

      <View style={styles.addSection}>
        <Text style={styles.sectionTitle}>Add New Member</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Member Name (e.g., John Doe)"
          placeholderTextColor={theme.placeholder}
          value={newMemberName}
          onChangeText={setNewMemberName}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Email Address (e.g., john@company.com)"
          placeholderTextColor={theme.placeholder}
          value={newMemberEmail}
          onChangeText={setNewMemberEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TouchableOpacity
          style={[styles.addButton, saving && styles.addButtonDisabled]}
          onPress={addTeamMember}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.addButtonText}>➕ Add Team Member</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>
          Current Team ({teamMembers.length})
        </Text>
        
        {teamMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No team members yet.{'\n'}Add your first team member above!
            </Text>
          </View>
        ) : (
          <FlatList
            data={teamMembers}
            renderItem={renderTeamMember}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: theme.textSecondary,
  },
  header: {
    backgroundColor: theme.primary,
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    color: theme.textInverse,
    fontSize: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.textInverse,
  },
  infoBox: {
    backgroundColor: theme.info + '20',
    padding: 15,
    margin: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.info,
  },
  infoText: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 20,
  },
  addSection: {
    backgroundColor: theme.surface,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: theme.text,
  },
  input: {
    backgroundColor: theme.inputBackground,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    color: theme.text,
  },
  addButton: {
    backgroundColor: theme.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: theme.textInverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  listSection: {
    flex: 1,
    backgroundColor: theme.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  listContent: {
    paddingBottom: 20,
  },
  memberCard: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceAlt,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 5,
  },
  memberEmail: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  deleteButton: {
    padding: 10,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default TeamMembersScreen;