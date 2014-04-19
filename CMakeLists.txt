cmake_minimum_required(VERSION 2.8)
project(CPPFORMAT)

add_custom_command(OUTPUT css/cppformat.css
  COMMAND lessc --clean-css --include-path=bootstrap cppformat.less css/cppformat.css
  DEPENDS cppformat.less)
add_custom_target(cppformat-css ALL DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/css/cppformat.css)
