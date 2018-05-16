# =============================================================================
# Makefile for Simple Input with OpenCV
# =============================================================================

# -----------------------------------------------------------------------------
# Tools
# -----------------------------------------------------------------------------
COMPILER = g++
#COMPILER = mingw32-g++
LINKER = $(COMPILER)
# Listings with Ascii2Postscript & Postscript2PDF
A2PS = a2ps
PS2PDF = ps2pdf -dPDFX=true -sPAPERSIZE=a4
# Documentation
DOCTOOL = doxygen
# OS specific
OSTYPE = $(shell uname -s)
ifeq ($(findstring NT,$(OSTYPE)),NT)
	# Windows systems
	SFX=.exe
	ARCH = zip
	ARCHOPT =
	ARCHEXT = .zip
else
	# Linux, FreeBSD or Darwin or others
	SFX=
	ARCH = tar
	ARCHOPT = -zcvf
	ARCHEXT = .tgz
endif
# current date (used in archive filename)
DATE = $(shell date +%Y-%m-%d)
# Packages manager
PKGCONFIG = pkg-config
# code static analysis
SPLINT = splint

TOOLS = $(COMPILER) $(A2PS) $(DOCTOOL) $(PKGCONFIG) $(ARCH) $(SPLINT)

# -----------------------------------------------------------------------------
# Flags and packages
# -----------------------------------------------------------------------------

# Compilation flags
CFLAGS = -W -Wall -g
#CFLAGS = -O3
# Debug flag definition : -D_DEBUG
# Explicit template generation by protoinstanciation : -fno-implicit-templates
# Automatic template generation : -frepo
# Optimize flags : -O2 or -O3
# No cygwin : -mno-cygwin

# linkage flags
LFLAGS =

# common libraries names (i.e.: m for math, z for zlib, ...)
LIBNAMES =
# common libraries linkage flags (i.e.: -lm -lz -l...)
CLIBS = $(foreach name, $(LIBNAMES),-l$(name))

# Used packages list managed by pkg-config
# (check installed packages with pkg-config --list-all)
PACKAGES = opencv
# Compile and Link flags associated with these packages (if any)
#	- INCLUDES are used during compilation step
#	- LIBS are used during linkage step
ifneq ($(PACKAGES),)
	LIBS = $(shell $(PKGCONFIG) --libs $(PACKAGES))
	INCLUDES = -I. $(shell $(PKGCONFIG) --cflags $(PACKAGES))
else
	LIBS =
	INCLUDES = -I.
endif

# Special linkage flags for OpenCV on Windows with MinGW
ifeq ($(findstring NT,$(OSTYPE)), NT)
	ifeq ($(findstring opencv,$(PACKAGES)), opencv)
		# Enable auto import is needed by openCV with windows in order to
		# import symbols from DLLs
		LFLAGS := -Wl,--enable-auto-import $(LFLAGS)
	endif
endif

# -----------------------------------------------------------------------------
# Project name and sources (check these variables with "make check")
# -----------------------------------------------------------------------------

# Project name (for listing and archive purpose only)
PROJECT = OpenCV_Calibration
# Project nature (c or cpp)
EXT=.cpp
# List of classes or modules (couples of .h/.c[pp]) WITHOUT extensions
MODULES =
# List of programs (.c[pp] files containing main function) WITHOUT extensions
MAINS = calibration imagelist_creator readCalibrationMatrix
# List of c or c++ header files
HEADERS = $(foreach name, $(MODULES), $(name).h)
# List of c or c++ source files
SOURCES = $(foreach name, $(MODULES), $(name)$(EXT)) \
$(foreach name, $(MAINS), $(name)$(EXT))
# List of all sources files (Makefile + .h and .c[pp])
ALLSOURCES = Makefile $(foreach name, $(MODULES),$(name).h $(name)$(EXT)) \
$(foreach name, $(MAINS), $(name)$(EXT))
# List of all source files (with .h replaced by .hpp for correct printing with a2ps)
CPPSOURCES = $(ALLSOURCES:.h=.hpp)
# Additional files (docs, readme, etc.)
ADDITIONAL = Doxyfile pattern.pdf
# Object files to be linked
# Classes or Modules objects
MOBJECTS = $(foreach name, $(MODULES), $(name).o)
# Main programs objects
POBJECTS = $(foreach name, $(MAINS), $(name).o)
# Programs to be generated
PROGRAMS = $(POBJECTS:.o=$(SFX))
# PS and PDF listings
LISTING = $(PROJECT)
# All files for the archive
ALLFILES = $(ALLSOURCES) $(ADDITIONAL)

# Phony targets (don't need file check)
.PHONY : clean realclean doc ps pdf archive edit check checkenv
# suffixes
.SUFFIXES : $(EXT).o

# -----------------------------------------------------------------------------
# targets
# -----------------------------------------------------------------------------
all : .depend $(PROGRAMS)

other : pdf doc archive

# Automatic dependencies generation .o: .h .c[pp]
.depend :
	@echo building dependencies ...
	$(COMPILER) -MM $(SOURCES) $(INCLUDES) > .depend
	@echo done.

# dependencies include
-include .depend

# source files compilation generic target
$(EXT).o:
	@echo compiling $< file ...
	$(COMPILER) $(CFLAGS) -c $< $(INCLUDES)
	@echo done.

# programs link generic target
%$(SFX) : %.o $(MOBJECTS)
	@echo Linking Executable $@ ...
	$(LINKER) $(LFLAGS) -o $@ $^ $(LIBS) $(CLIBS)
	@echo done

# run the program(s)
run : $(PROGRAMS)
	@$(foreach prgm, $(PROGRAMS), echo executing $(prgm); $(prgm);)

# cleaning object files, listings, documentation and programs
clean : unlinks
	@echo cleaning obj, listing and doc files ...
#	@echo cleaning *.o *~ .depend $(PROGRAMS) $(LISTING).ps $(LISTING).pdf doc
	rm -rf *.o *~ .depend $(PROGRAMS) $(LISTING).ps $(LISTING).pdf doc
	@echo done.

# cleaning also generated archives
realclean : clean
	@echo cleaning archives files ...
#	@echo cleaning $(PROJECT)-*$(ARCHEXT)
	rm -f $(PROJECT)-*$(ARCHEXT)
	@echo done.

# Creating links for C++ header files
links : unlinks
	@echo creating symbolic links for C++ header files
	$(foreach header, $(HEADERS), ln -s $(header) $(header)pp;)
	@echo done.

# Destroying links for C++ header files
unlinks :
	@echo cleaning symbolic links for C++ header files
	rm -f *.hpp
	@echo done.

# Postscript listing
ps : $(ALLSOURCES) links
	@echo generating Postscript listing ...
	$(A2PS) -2 --file-align=fill --line-numbers=1 --font-size=10 \
	--chars-per-line=90 --tabsize=4 --pretty-print --highlight-level=heavy \
	--prologue="gray" \
	-o$(LISTING).ps $(CPPSOURCES);
	@echo done.

# PDF listing
pdf : ps
	@echo generating PDF listing ...
	$(PS2PDF) $(LISTING).ps $(LISTING).pdf
	@echo done.

# editing files
edit :
	@echo editing files ...
	@echo editor is : $(EDITOR)
	"$(EDITOR)" $(ALLFILES) &
	@echo done.

# generating documentation in doc folder
doc : Doxyfile $(ALLSOURCES)
	@echo generating documentation ...
	$(DOCTOOL) Doxyfile
#	make -C doc/latex
	@echo done.

# backup important files in dated archive
archive : pdf $(ALLFILES)
	@echo generating archive ...
	$(ARCH) $(ARCHOPT) $(PROJECT)-$(DATE)$(ARCHEXT) $(ALLFILES) $(LISTING).pdf
	@echo done.

# Check project variables
check :
	@echo Checking project variables ...
	@echo project name: $(PROJECT)
	@echo modules: $(MODULES)
	@echo main programs: $(MAINS)
	@echo header files: $(HEADERS)
	@echo source files: $(SOURCES)
	@echo All source files: $(ALLSOURCES)
	@echo All CPP source files: $(CPPSOURCES)
	@echo Classes and Modules objects: $(MOBJECTS)
	@echo Main programs objects: $(POBJECTS)
	@echo Main programs targets: $(PROGRAMS)
	@echo compile flags: $(CFLAGS) \<file\> $(INCLUDES)
	@echo link flags: $(LFLAGS) \<output\> $(LIBS) $(CLIBS)
	@echo done.

# Check tools versions and locations, and also required packages versions
checkenv :
	@echo required tools : $(TOOLS)
	@$(foreach tool, $(TOOLS),\
	echo --------------------------------------------------------------------;\
	echo $(tool) version   : `$(tool) --version`;\
	echo $(tool) location  : `which $(tool)`;)
	@echo --------------------------------------------------------------------;
	@echo required packages : $(PACKAGES)
	@$(foreach package, $(PACKAGES), echo "$(package) version : " \
	`$(PKGCONFIG) --modversion $(package)`;)
