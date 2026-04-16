const React = require('react');
const { Text } = require('react-native');

const Ionicons = ({ name, size, color, ...props }) =>
  React.createElement(Text, { ...props, testID: `icon-${name}` }, name);

module.exports = Ionicons;
module.exports.default = Ionicons;
