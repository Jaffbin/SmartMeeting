import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';

const TaskEditor = ({ tasks, teamMembers, onSave, onCancel }) => {
  const [editedTasks, setEditedTasks] = useState(tasks.map(task => ({ ...task })));

  const updateTask = (index, field, value) => {
    const updated = [...editedTasks];
    updated[index][field] = value;
    setEditedTasks(updated);
  };

  const deleteTask = (index) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = editedTasks.filter((_, i) => i !== index);
            setEditedTasks(updated);
          }
        }
      ]
    );
  };

  const addNewTask = () => {
    setEditedTasks([
      ...editedTasks,
      {
        description: '',
        assignee: 'Unassigned',
        deadline: 'No deadline',
        priority: 'Medium',
      }
    ]);
  };

  const handleSave = () => {
    const invalidTasks = editedTasks.filter(task => !task.description.trim());
    if (invalidTasks.length > 0) {
      Alert.alert('Error', 'All tasks must have a description');
      return;
    }

    onSave(editedTasks);
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Tasks</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {editedTasks.map((task, index) => (
            <View key={index} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskNumber}>Task {index + 1}</Text>
                <TouchableOpacity onPress={() => deleteTask(index)}>
                  <Text style={styles.deleteButton}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>

              {/* Task Description */}
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={styles.input}
                value={task.description}
                onChangeText={(text) => updateTask(index, 'description', text)}
                placeholder="Enter task description"
                multiline
              />

              {/* Assignee Selection */}
              <Text style={styles.label}>Assignee</Text>
              <View style={styles.assigneeContainer}>
                <TouchableOpacity
                  style={[
                    styles.assigneeOption,
                    task.assignee === 'Unassigned' && styles.assigneeSelected
                  ]}
                  onPress={() => updateTask(index, 'assignee', 'Unassigned')}
                >
                  <Text style={styles.assigneeText}>Unassigned</Text>
                </TouchableOpacity>

                {teamMembers.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.assigneeOption,
                      task.assignee === member.name && styles.assigneeSelected
                    ]}
                    onPress={() => updateTask(index, 'assignee', member.name)}
                  >
                    <Text style={styles.assigneeText}>{member.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Assignee Input */}
              <TextInput
                style={styles.input}
                value={task.assignee !== 'Unassigned' && !teamMembers.find(m => m.name === task.assignee) ? task.assignee : ''}
                onChangeText={(text) => updateTask(index, 'assignee', text)}
                placeholder="Or enter custom name"
              />

              {/* Deadline */}
              <Text style={styles.label}>Deadline</Text>
              <TextInput
                style={styles.input}
                value={task.deadline}
                onChangeText={(text) => updateTask(index, 'deadline', text)}
                placeholder="e.g., Friday, Next week, 2025-01-20"
              />

              {/* Priority */}
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityContainer}>
                {['High', 'Medium', 'Low'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      task.priority === priority && styles.prioritySelected,
                      priority === 'High' && styles.priorityHigh,
                      priority === 'Medium' && styles.priorityMedium,
                      priority === 'Low' && styles.priorityLow,
                    ]}
                    onPress={() => updateTask(index, 'priority', priority)}
                  >
                    <Text style={styles.priorityText}>{priority}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={addNewTask}>
            <Text style={styles.addButtonText}>➕ Add New Task</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    color: 'white',
    fontSize: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  taskCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  taskNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  deleteButton: {
    fontSize: 14,
    color: '#FF3B30',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
  },
  assigneeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  assigneeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  assigneeSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  assigneeText: {
    fontSize: 14,
    color: '#333',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  prioritySelected: {
    borderWidth: 3,
  },
  priorityHigh: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  priorityMedium: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  priorityLow: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TaskEditor;