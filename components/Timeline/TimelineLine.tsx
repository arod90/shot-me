import React from 'react';
import { StyleSheet, Animated } from 'react-native';

// @ts-ignore
export default function TimelineLine({ height }) {
  return <Animated.View style={[styles.timelineLine, { height }]} />;
}

const styles = StyleSheet.create({
  timelineLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#FFFFFF',
    left: '50%',
    transform: [{ translateX: -1 }],
    top: 0,
    bottom: 0,
  },
});
