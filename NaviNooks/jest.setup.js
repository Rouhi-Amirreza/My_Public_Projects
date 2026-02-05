import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native-date-picker', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => {
    return React.createElement('DatePicker', props);
  });
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const MapView = React.forwardRef((props, ref) => {
    return React.createElement('MapView', props);
  });
  MapView.Marker = React.forwardRef((props, ref) => {
    return React.createElement('Marker', props);
  });
  MapView.Polyline = React.forwardRef((props, ref) => {
    return React.createElement('Polyline', props);
  });
  return MapView;
});

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
  })
);

