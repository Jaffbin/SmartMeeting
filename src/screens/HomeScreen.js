import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';
import { StorageService } from '../services/StorageService';
import { ErrorHandler } from '../utils/ErrorHandler';

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    backgroundColor: theme.primary,
    padding: 20,
    paddingTop: 50,
    paddingBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.textInverse,
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: theme.textInverse,
    opacity: 0.9,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  profileIcon: {
    fontSize: 24,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: theme.text,
  },
  card: {
    backgroundColor: theme.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  recordCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  uploadCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.success,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: theme.text,
  },
  cardDesc: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.surface,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  searchBar: {
    backgroundColor: theme.inputBackground || theme.surface,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.inputBorder || theme.border,
    color: theme.text,
    placeholderTextColor: theme.placeholder,
  },
  filterToggle: {
    backgroundColor: theme.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  filtersContainer: {
    backgroundColor: theme.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterGroup: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  filterChipTextActive: {
    color: theme.textInverse,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: theme.surface,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  meetingCard: {
    backgroundColor: theme.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  meetingIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  meetingIcon: {
    fontSize: 24,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  meetingDate: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusCompleted: {
    backgroundColor: theme.statusCompleted,
  },
  statusProcessing: {
    backgroundColor: theme.statusProcessing,
  },
  statusFailed: {
    backgroundColor: theme.statusFailed,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.text,
  },

logoutButton: {
  margin: 20,
  padding: 15,
  backgroundColor: theme.error,
  borderRadius: 8,
  alignItems: 'center',
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
logoutText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: 'bold',
},
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.textTertiary,
    marginBottom: 4,
  },
});

const HomeScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { theme, isDarkMode } = useTheme();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMeetings();
    });
    return unsubscribe;
  }, [navigation]);
  
  // Validate theme
  if (!theme || !theme.background) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <Text>Loading theme...</Text>
      </View>
    );
  }
  
  const styles = createStyles(theme);

  const loadMeetings = async () => {
    try {
      const data = await StorageService.getUserMeetings();
      setMeetings(data);
    } catch (error) {
      const errorMessage = ErrorHandler.handle(error, 'load meetings');
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMeetings();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              const errorMessage = ErrorHandler.handle(error, 'logout');
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const filteredMeetings = meetings.filter(meeting =>
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFilteredAndSortedMeetings = () => {
    let result = filteredMeetings;

    if (filterStatus !== 'all') {
      result = result.filter(m => m.status === filterStatus);
    }

    switch (sortBy) {
      case 'date':
        result = [...result].sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'title':
        result = [...result].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'status':
        result = [...result].sort((a, b) => a.status.localeCompare(b.status));
        break;
    }

    return result;
  };

  const displayMeetings = getFilteredAndSortedMeetings();

  const stats = {
    total: meetings.length,
    completed: meetings.filter(m => m.status === 'completed').length,
    processing: meetings.filter(m => m.status === 'processing').length,
    totalTasks: meetings.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Welcome! 👋</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={[styles.card, styles.recordCard]}
          onPress={() => navigation.navigate('Recording')}
        >
          <Text style={styles.cardIcon}>🎙️</Text>
          <Text style={styles.cardTitle}>Record Meeting</Text>
          <Text style={styles.cardDesc}>Start a new recording</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.uploadCard]}
          onPress={() => navigation.navigate('Upload')}
        >
          <Text style={styles.cardIcon}>📁</Text>
          <Text style={styles.cardTitle}>Upload Audio</Text>
          <Text style={styles.cardDesc}>Upload existing file</Text>
        </TouchableOpacity>
      </View>

      {!loading && meetings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Statistics</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>✅</Text>
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🔄</Text>
              <Text style={styles.statValue}>{stats.processing}</Text>
              <Text style={styles.statLabel}>Processing</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>✓</Text>
              <Text style={styles.statValue}>{stats.totalTasks}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Recent Meetings ({displayMeetings.length})
        </Text>

        {!loading && meetings.length > 0 && (
          <>
            <TextInput
              style={styles.searchBar}
              placeholder="🔍 Search meetings..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.placeholder}
            />

            <TouchableOpacity
              style={styles.filterToggle}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={styles.filterToggleText}>
                {showFilters ? '🔼' : '🔽'} {showFilters ? 'Hide' : 'Show'} Filters
              </Text>
            </TouchableOpacity>

            {showFilters && (
              <View style={styles.filtersContainer}>
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>Status:</Text>
                  <View style={styles.filterRow}>
                    {['all', 'completed', 'processing', 'failed'].map(status => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.filterChip,
                          filterStatus === status && styles.filterChipActive
                        ]}
                        onPress={() => setFilterStatus(status)}
                      >
                        <Text style={[
                          styles.filterChipText,
                          filterStatus === status && styles.filterChipTextActive
                        ]}>
                          {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>Sort by:</Text>
                  <View style={styles.filterRow}>
                    {[
                      { value: 'date', label: '📅 Date' },
                      { value: 'title', label: '🔤 Title' },
                      { value: 'status', label: '📊 Status' }
                    ].map(option => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.filterChip,
                          sortBy === option.value && styles.filterChipActive
                        ]}
                        onPress={() => setSortBy(option.value)}
                      >
                        <Text style={[
                          styles.filterChipText,
                          sortBy === option.value && styles.filterChipTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </>
        )}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : meetings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No meetings yet</Text>
            <Text style={styles.emptySubtext}>
              Start recording or upload an audio file
            </Text>
          </View>
        ) : displayMeetings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No meetings found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or search term
            </Text>
          </View>
        ) : (
          displayMeetings.map((meeting) => (
            <TouchableOpacity
              key={meeting.id}
              style={styles.meetingCard}
              onPress={() => {
                navigation.navigate('MeetingDetail', { meetingId: meeting.id });
              }}
            >
              <View style={styles.meetingIconContainer}>
                <Text style={styles.meetingIcon}>🎙️</Text>
              </View>
              <View style={styles.meetingInfo}>
                <Text style={styles.meetingTitle}>{meeting.title}</Text>
                <Text style={styles.meetingDate}>
                  {meeting.createdAt instanceof Date ? meeting.createdAt.toLocaleDateString() : new Date(meeting.createdAt).toLocaleDateString()} {' '}
                  {meeting.createdAt instanceof Date ? meeting.createdAt.toLocaleTimeString() : new Date(meeting.createdAt).toLocaleTimeString()}
                </Text>
                <View style={[
                  styles.statusPill,
                  meeting.status === 'completed' && styles.statusCompleted,
                  meeting.status === 'processing' && styles.statusProcessing,
                  meeting.status === 'failed' && styles.statusFailed,
                ]}>
                  <Text style={styles.statusText}>
                    {meeting.status?.charAt(0).toUpperCase() + (meeting.status || 'unknown').slice(1)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Meeting Assistant v1.0.0</Text>
        <Text style={styles.footerText}>
          {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </Text>
      </View>
    </ScrollView>
  );
};

export default HomeScreen;