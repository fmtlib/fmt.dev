cmake_minimum_required(VERSION 2.8)
project(CPPFORMAT)

add_custom_command(OUTPUT cppformat.css
  COMMAND lessc --clean-css --include-path=less/bootstrap less/cppformat.less cppformat.css
  DEPENDS less/cppformat.less)
add_custom_target(cppformat-css ALL SOURCES ${CMAKE_CURRENT_BINARY_DIR}/cppformat.css)
