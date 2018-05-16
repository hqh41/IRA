/*
 * readCalibrationMatrix.cpp
 *
 *  Created on: 2 avr. 2011
 *      Author: davidroussel
 */

#include <iostream>
#include <opencv2/core/core.hpp>

using namespace std;
using namespace cv;

ostream & usage (ostream & os, char * name)
{
	os << "usage : " << name << " <calib_camera_data_file.yaml>" << endl;
	return os;
}

int main (int argc, char ** argv)
{
	string filename;
	FileStorage * fs = NULL;

	// ------------------------------------------------------------------------
	// parse arguments
	// ------------------------------------------------------------------------
	if (argc < 2)
	{
		cerr << usage(cerr, argv[0]);
	}
	else
	{
		filename = argv[1];
	}
	// ------------------------------------------------------------------------
	// search for calibration matrix in file
	// ------------------------------------------------------------------------
	fs = new FileStorage(filename, FileStorage::READ);
	if (!fs->isOpened())
	{
		cerr << "Failed to open FileStorage : " << filename << endl;
		return EXIT_FAILURE;
	}

	Mat cameraMatrix;
	(*fs)["camera_matrix"] >> cameraMatrix;

	cout << "matrix size = ["<< cameraMatrix.rows << "x" << cameraMatrix.cols
	     << "]" << endl;
	cout << "matrix element size = " << cameraMatrix.elemSize() << endl;
	cout << "Camera matrix = " << cameraMatrix << endl;

	// ------------------------------------------------------------------------
	// Explain calibration matrix parameters
	// ------------------------------------------------------------------------
	delete fs;
	return EXIT_SUCCESS;
}
