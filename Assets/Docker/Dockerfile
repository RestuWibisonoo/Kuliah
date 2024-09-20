# Gunakan image dasar Ubuntu
FROM ubuntu:20.04

# Set environment variable untuk non-interactive mode
ENV DEBIAN_FRONTEND=noninteractive

# Update dan install dependencies yang dibutuhkan
RUN apt-get update && apt-get install -y \
    openjdk-8-jdk wget curl ssh pdsh vim python3 sudo openssh-server

# Set Java Home
ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Install Hadoop
RUN wget https://downloads.apache.org/hadoop/common/hadoop-3.3.6/hadoop-3.3.6.tar.gz \
    && tar -xzvf hadoop-3.3.6.tar.gz \
    && mv hadoop-3.3.6 /usr/local/hadoop \
    && rm hadoop-3.3.6.tar.gz

ENV HADOOP_HOME=/usr/local/hadoop
ENV PATH=$HADOOP_HOME/bin:$HADOOP_HOME/sbin:$PATH
ENV HADOOP_CONF_DIR=$HADOOP_HOME/etc/hadoop

# Install Hive
RUN wget https://downloads.apache.org/hive/hive-3.1.3/apache-hive-3.1.3-bin.tar.gz \
    && tar -xzvf apache-hive-3.1.3-bin.tar.gz \
    && mv apache-hive-3.1.3-bin /usr/local/hive \
    && rm apache-hive-3.1.3-bin.tar.gz

ENV HIVE_HOME=/usr/local/hive
ENV PATH=$HIVE_HOME/bin:$PATH

# SSH setup (Hadoop membutuhkan SSH untuk komunikasi antar node)
RUN service ssh start \
    && ssh-keygen -t rsa -f /root/.ssh/id_rsa -q -P "" \
    && cat /root/.ssh/id_rsa.pub >> /root/.ssh/authorized_keys \
    && chmod 0600 /root/.ssh/authorized_keys

# Setup Hadoop configuration files
COPY core-site.xml $HADOOP_HOME/etc/hadoop/core-site.xml
COPY hdfs-site.xml $HADOOP_HOME/etc/hadoop/hdfs-site.xml
COPY mapred-site.xml $HADOOP_HOME/etc/hadoop/mapred-site.xml
COPY yarn-site.xml $HADOOP_HOME/etc/hadoop/yarn-site.xml

# Setup Hive configuration files
COPY hive-site.xml $HIVE_HOME/conf/hive-site.xml

# Format Hadoop namenode
RUN $HADOOP_HOME/bin/hdfs namenode -format

# Expose ports for HDFS, YARN, and Hive
EXPOSE 50070 8088 10000

# Start SSH service and Hadoop daemons (using JSON format for CMD)
CMD ["sh", "-c", "service ssh start && $HADOOP_HOME/sbin/start-dfs.sh && $HADOOP_HOME/sbin/start-yarn.sh && $HIVE_HOME/bin/hiveserver2"]